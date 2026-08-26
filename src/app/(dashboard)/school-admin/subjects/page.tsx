import { redirect } from "next/navigation";

/** Subjects are managed under Academic Structure for now. */
export default function SubjectsRedirectPage() {
  redirect("/school-admin/academic");
}
