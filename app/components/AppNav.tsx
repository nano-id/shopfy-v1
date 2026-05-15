import { NavMenu } from "@shopify/app-bridge-react";

export function AppNav() {
  return (
    <NavMenu>
      <a href="/app" rel="home">
        Dashboard
      </a>
      <a href="/app/conversations">Conversations</a>
      <a href="/app/orders">Orders</a>
      <a href="/app/returns">Returns</a>
      <a href="/app/settings">Settings</a>
    </NavMenu>
  );
}
