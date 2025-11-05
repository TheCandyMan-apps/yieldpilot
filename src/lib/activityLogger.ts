import { supabase } from "@/integrations/supabase/client";

export const logUserActivity = async (
  userId: string,
  eventType: string,
  description: string
) => {
  try {
    const userAgent = navigator.userAgent;
    const deviceInfo = {
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    await supabase.rpc("log_user_activity_event", {
      p_user_id: userId,
      p_event_type: eventType,
      p_event_description: description,
      p_user_agent: userAgent,
      p_device_info: deviceInfo,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};
