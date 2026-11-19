import { Alert } from "react-native";
import { resetRoot, Role, switchRole } from "./auth";

// Ask first, then flip this account between Worker and Employer and open the matching home.
export function confirmSwitchAccount(navigation: any, target: Role) {
  const label = target === "employer" ? "Employer" : "Worker";
  const info =
    target === "employer"
      ? "You will be able to post jobs and hire workers. Your worker profile and applications stay saved."
      : "You will be able to find jobs and apply. Your jobs and applicants stay saved.";
  Alert.alert(`Switch to ${label} account?`, `${info}\n\nSame phone number, no new OTP needed.`, [
    { text: "Cancel", style: "cancel" },
    {
      text: `Switch to ${label}`,
      onPress: async () => {
        const res = await switchRole(target);
        if (res.error) {
          Alert.alert("Could not switch", res.error);
          return;
        }
        if (target === "employer") resetRoot(navigation, "EmployerTabs");
        else resetRoot(navigation, res.needsWorkerSetup ? "ProfileSetup" : "WorkerTabs");
      },
    },
  ]);
}
