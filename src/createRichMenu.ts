// Make sure to import environment variables at the very beginning
import "./lib/env";

import * as fs from "fs";
import * as path from "path";
import { messagingApi } from "@line/bot-sdk";
import { richMenuAArea } from "./constants/richMenuArea";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

const blobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

async function createRichMenu({
  richMenu,
  filename,
  richMenuAliasId,
}: {
  richMenu: messagingApi.RichMenuRequest;
  filename: string;
  richMenuAliasId: string;
}) {
  // Create the rich menu
  const richMenuId = (await client.createRichMenu(richMenu)).richMenuId;

  // Upload the image
  const imagePath = path.join(__dirname, "assets", filename);
  const imageBuffer = fs.readFileSync(imagePath);

  await blobClient.setRichMenuImage(
    richMenuId,
    new Blob([imageBuffer], { type: "image/jpeg" }),
  );

  const aliasList = await client.getRichMenuAliasList();
  if (!!aliasList.aliases.find((a) => a.richMenuAliasId === richMenuAliasId)) {
    await client.deleteRichMenuAlias(richMenuAliasId);
  }
  await client.createRichMenuAlias({
    richMenuId,
    richMenuAliasId: richMenuAliasId,
  });
  console.log(`richMenuAliasId '${richMenuAliasId}' is set`);
  return richMenuId;
}

async function main() {
  const richMenuAId = await createRichMenu({
    richMenu: {
      size: { width: 2500, height: 1686 }, // compact size
      selected: true,
      name: "Compact Menu A",
      chatBarText: "主選單",
      areas: richMenuAArea,
    },
    richMenuAliasId: "richmenu-alias-a",
    filename: "richmenu_1773416015327.jpg",
  });
  //   const richMenuBId = await createRichMenu({
  //     richMenu: {
  //       size: { width: 2500, height: 1686 }, // compact size
  //       selected: true,
  //       name: "Compact Menu B",
  //       chatBarText: "主選單",
  //       areas: richMenuBArea,
  //     },
  //     richMenuAliasId: "richmenu-alias-b",
  //     filename: "richmenu_1756965662072.jpg",
  //   });

  // Save the rich menu IDs to a JSON file
  const outputPath = path.join(__dirname, "../richMenuIds.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ richMenuAId }, null, 2),
    "utf-8",
  );
  console.log("Rich menu IDs saved to:", outputPath);

  // Set the rich menu as the default
  await client.setDefaultRichMenu(richMenuAId);
  client.linkRichMenuIdToUser;

  console.log("Rich menu created and set as default:", richMenuAId);
}

main();
