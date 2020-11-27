import { createClient } from "./client";
import { getOneTimeUrl } from "./mutations/get-one-time-url";
import { getSubscriptionUrl } from "./mutations/get-subscription-url";
import { updateCustomer } from "./mutations/update-customer";
import { getCustomer } from "./mutations/get-customer";
import { createScriptTag } from "./mutations/create-script-tag";
import { registerWebhooks } from "./register-webhooks";

export { createClient, getOneTimeUrl, getSubscriptionUrl, registerWebhooks, updateCustomer, createScriptTag, getCustomer };
