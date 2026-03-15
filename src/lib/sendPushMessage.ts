export async function sendPushMessage({
  userId,
  message,
}: {
  userId: string;
  message: string;
}): Promise<{ success: true } | { success: false; error: any }> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Ensure LINE_CHANNEL_ACCESS_TOKEN is set in your environment variables
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    // Check if the LINE API request was successful
    if (response.ok) {
      console.log(`Push message sent to ${userId}`);
      return { success: true };
    } else {
      const errorData = await response.json();
      console.error(`Failed to send push message to ${userId}:`, errorData);
      return { success: false, error: errorData };
    }
  } catch (error) {
    console.error("Error sending push message:", error);
    return { success: false, error: "Internal server error." };
  }
}
