import { createClient } from "./client";
import { updateMetafield } from "./mutations/update-metafield";
import { createScriptTag } from "./mutations/create-script-tag";
import { getShop } from "./mutations/get-shop";
import { registerShop } from "./register-shop";
import { registerWebhooks } from "./register-webhooks";

export {
  createClient,
  updateMetafield,
  createScriptTag,
  getShop,
  registerShop,
  registerWebhooks,
};
