import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function createApiKey({ container }: { container: any }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  logger.info("Creating publishable API key...");

  // Get default sales channel
  const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel) {
    logger.error("No default sales channel found!");
    return;
  }

  // Create API key
  const { result: apiKeyResult } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Baucis Zen Storefront",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  const apiKey = apiKeyResult[0];

  // Link to sales channel
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  logger.info("========================================");
  logger.info("✅ API Key Created!");
  logger.info("========================================");
  logger.info("");
  logger.info("Update your frontend .env.local with:");
  logger.info(`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="${apiKey.token}"`);
  logger.info("");
}
