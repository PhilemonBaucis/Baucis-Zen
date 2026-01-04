import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { updateStoresStep } from "@medusajs/medusa/core-flows";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies-baucis",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  }
);

export default async function setupBaucis({ container }: { container: any }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  // Baucis countries: Albania, Kosovo, and EU expansion
  const balkansCountries = ["al", "xk"];
  const euCountries = ["de", "at", "it", "gr", "fr", "es", "nl", "be", "ch"];
  const allCountries = [...balkansCountries, ...euCountries];

  logger.info("========================================");
  logger.info("🌿 Setting up Baucis Zen Store");
  logger.info("========================================");

  // Get or create store
  const [store] = await storeModuleService.listStores();
  logger.info(`📦 Store: ${store.name} (${store.id})`);

  // Get or create default sales channel
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    });
    defaultSalesChannel = salesChannelResult;
    logger.info("✅ Created Default Sales Channel");
  }

  // Update store currencies (EUR as default, ALL for Albania)
  logger.info("💱 Setting up currencies...");
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        { currency_code: "eur", is_default: true },
        { currency_code: "all" }, // Albanian Lek
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("✅ Currencies configured (EUR default, ALL supported)");

  // Create regions
  logger.info("🌍 Creating regions...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Balkans",
          currency_code: "eur",
          countries: balkansCountries,
          payment_providers: ["pp_system_default"],
        },
        {
          name: "European Union",
          currency_code: "eur",
          countries: euCountries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const balkansRegion = regionResult.find((r) => r.name === "Balkans");
  const euRegion = regionResult.find((r) => r.name === "European Union");
  logger.info(`✅ Created regions: Balkans, European Union`);

  // Create tax regions with correct VAT rates
  logger.info("💰 Creating tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: [
      // Albania 20% VAT
      { country_code: "al", default_tax_rate: { rate: 20, name: "VAT", code: "vat-al" } },
      // Kosovo 18% VAT
      { country_code: "xk", default_tax_rate: { rate: 18, name: "VAT", code: "vat-xk" } },
      // EU countries (standard rates)
      { country_code: "de", default_tax_rate: { rate: 19, name: "VAT", code: "vat-de" } },
      { country_code: "at", default_tax_rate: { rate: 20, name: "VAT", code: "vat-at" } },
      { country_code: "it", default_tax_rate: { rate: 22, name: "VAT", code: "vat-it" } },
      { country_code: "gr", default_tax_rate: { rate: 24, name: "VAT", code: "vat-gr" } },
      { country_code: "fr", default_tax_rate: { rate: 20, name: "VAT", code: "vat-fr" } },
      { country_code: "es", default_tax_rate: { rate: 21, name: "VAT", code: "vat-es" } },
      { country_code: "nl", default_tax_rate: { rate: 21, name: "VAT", code: "vat-nl" } },
      { country_code: "be", default_tax_rate: { rate: 21, name: "VAT", code: "vat-be" } },
      { country_code: "ch", default_tax_rate: { rate: 8.1, name: "VAT", code: "vat-ch" } },
    ],
  });
  logger.info("✅ Tax regions created (AL 20%, XK 18%, EU rates)");

  // Create stock location
  logger.info("📍 Creating stock location...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Long Hills Warehouse",
          address: {
            city: "Tirana",
            country_code: "AL",
            address_1: "Rruga Long Hills",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];
  logger.info(`✅ Created stock location: ${stockLocation.name}`);

  // Set as default store location
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  // Link stock location to fulfillment provider
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });

  // Create shipping profile
  logger.info("🚚 Setting up fulfillment...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [{ name: "Default Shipping Profile", type: "default" }],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  // Create fulfillment set with service zones for Balkans and EU
  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Long Hills Warehouse Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Balkans Zone",
        geo_zones: [
          { country_code: "al", type: "country" },
          { country_code: "xk", type: "country" },
        ],
      },
      {
        name: "EU Zone",
        geo_zones: euCountries.map((cc) => ({ country_code: cc, type: "country" })),
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  });

  // Create shipping options (prices are calculated dynamically via API, these are fallbacks)
  const balkansZone = fulfillmentSet.service_zones.find((z) => z.name === "Balkans Zone");
  const euZone = fulfillmentSet.service_zones.find((z) => z.name === "EU Zone");

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping - Balkans",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: balkansZone!.id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "2-5 business days", code: "standard-balkans" },
        prices: [
          { currency_code: "eur", amount: 3 },
          { region_id: balkansRegion!.id, amount: 3 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Standard Shipping - EU",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: euZone!.id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "5-10 business days", code: "standard-eu" },
        prices: [
          { currency_code: "eur", amount: 15 },
          { region_id: euRegion!.id, amount: 15 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });
  logger.info("✅ Fulfillment and shipping options configured");

  // Link sales channel to stock location
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("✅ Sales channel linked to stock location");

  // Create inventory levels for existing products
  logger.info("📊 Setting up inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "title"],
  });

  if (inventoryItems.length > 0) {
    const inventoryLevels = inventoryItems.map((item: any) => ({
      location_id: stockLocation.id,
      stocked_quantity: 100, // Default stock quantity
      inventory_item_id: item.id,
    }));

    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    });
    logger.info(`✅ Created inventory levels for ${inventoryItems.length} items`);
  }

  logger.info("");
  logger.info("========================================");
  logger.info("✅ Baucis Zen Store Setup Complete!");
  logger.info("========================================");
  logger.info("");
  logger.info("Summary:");
  logger.info(`  • Store: ${store.name}`);
  logger.info(`  • Regions: Balkans (AL, XK), European Union`);
  logger.info(`  • Tax rates: AL 20%, XK 18%, EU country rates`);
  logger.info(`  • Stock location: Long Hills Warehouse (Tirana)`);
  logger.info(`  • Currencies: EUR (default), ALL`);
  logger.info("");
}
