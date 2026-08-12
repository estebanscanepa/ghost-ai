import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * `/` is a router, not a page: signed-in users land in the editor, everyone
 * else is sent to sign-in. There is no marketing surface at the root.
 */
export default async function Home() {
  const { userId } = await auth();

  redirect(userId ? "/editor" : "/sign-in");
}
