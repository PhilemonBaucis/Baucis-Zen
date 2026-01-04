import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";

export default async function run({ container }: { container: any }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillment = container.resolve(Modules.FULFILLMENT);
  const region = container.resolve(Modules.REGION);
  const stockLocation = container.resolve(Modules.STOCK_LOCATION);

  logger.info("Adding ULTA Balkans shipping for Albania & Kosovo...");

  // Get existing data
  const [eurRegion] = await region.listRegions({ currency_code: "eur" });
  const [profile] = await fulfillment.listShippingProfiles({ type: "default" });
  const [location] = await stockLocation.listStockLocations({});

  if (!eurRegion) {
    logger.error("EUR region not found!");
    return;
  }
  if (!profile) {
    logger.error("Default shipping profile not found!");
    return;
  }
  if (!location) {
    logger.error("Stock location not found!");
    return;
  }

  logger.info(`Found region: ${eurRegion.id}, profile: ${profile.id}, location: ${location.id}`);

  // Create fulfillment set for AL & XK
  const set = await fulfillment.createFulfillmentSets({
    name: "ULTA Balkans",
    type: "shipping",
    service_zones: [{
      name: "Albania & Kosovo",
      geo_zones: [
        { country_code: "al", type: "country" },
        { country_code: "xk", type: "country" },
      ],
    }],
  });

  logger.info(`Created fulfillment set: ${set.id}`);

  // Link to stock location
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
  });

  logger.info("Linked fulfillment set to stock location");

  // Create shipping option
  await createShippingOptionsWorkflow(container).run({
    input: [{
      name: "ULTA Shipping",
      price_type: "flat",
      provider_id: "manual_manual",
      service_zone_id: set.service_zones[0].id,
      shipping_profile_id: profile.id,
      type: { label: "ULTA", description: "ULTA C.E.P Delivery", code: "ulta" },
      prices: [
        { currency_code: "eur", amount: 0 },
        { region_id: eurRegion.id, amount: 0 },
      ],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    }],
  });

  logger.info("✅ ULTA Balkans shipping added successfully!");
}
