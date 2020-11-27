import { useState } from 'react';
import { Page, Card, TextStyle, ResourceItem, ResourceList, Avatar, Stack, Badge } from "@shopify/polaris";
// import { } from "@shopify/app-bridge-react";

const Index = () => {
  
  const [items, setItems] = useState([]);

  const resourceName = {
    singular: 'Setting',
    plural: 'Settings',
  };

  function renderItem(item) {
    return (
      <ResourceItem>
        <p></p>
      </ResourceItem>
    );
  }

  return (
    <Page
      fullWidth
      title="Settings"
      primaryAction={{content: 'Add Setting'}}
    >
      <Card>
        <ResourceList
          items={items}
          renderItem={renderItem}
          resourceName={resourceName}
        />
      </Card>
    </Page>
  )
};

export default Index;
