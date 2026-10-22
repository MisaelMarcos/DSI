import { Redirect } from "expo-router";

import { useSession } from "@/contexts/sessionContext";

export default function Index() {
  const { user } = useSession();
  return <Redirect href={user ? "/tabs/home" : "/login"} />;
}
