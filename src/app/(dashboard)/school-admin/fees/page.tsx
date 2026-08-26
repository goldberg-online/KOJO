import { redirect } from "next/navigation";

/** Finance is Accountant-only. School Admin has no fee tools. */
export default function SchoolAdminFeesRedirect() {
  redirect("/school-admin/academic");
}
