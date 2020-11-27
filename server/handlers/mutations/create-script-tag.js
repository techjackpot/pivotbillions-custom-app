import "isomorphic-fetch";
import { gql } from "apollo-boost";

export function SCRIPT_TAG_CREATE() {
  return gql`
    mutation scriptTagCreate($input: ScriptTagInput!) {
      scriptTagCreate(input: $input) {
        scriptTag {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
}

export const createScriptTag = async (ctx, variables) => {
  const { client } = ctx;
  const customer = await client
    .mutate({
      mutation: SCRIPT_TAG_CREATE(),
      variables: {
        "input": variables,
      },
    })
    .then(response => response.data.scriptTagCreate.scriptTag);

  return customer;
};
