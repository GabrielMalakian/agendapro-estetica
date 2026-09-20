import { redirect } from "next/navigation";

/** A raiz manda para o login; de lá o guard distribui por papel. */
export default function RootPage() {
  redirect("/login");
}
