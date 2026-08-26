import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFeeStructures,
  getSectionsForSchool,
} from "@/lib/actions/fees";
import { FeeStructureForm } from "@/components/shared/fee-structure-form";
import { EditFeeStructureForm } from "@/components/shared/edit-fee-structure-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";

export default async function FeeStructuresPage() {
  const session = await auth();
  if (
    !session?.user ||
    !["ACCOUNTANT", "SUPER_ADMIN"].includes(session.user.role)
  ) {
    redirect("/login");
  }

  const [structures, sections] = await Promise.all([
    getFeeStructures(),
    getSectionsForSchool(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Fee Structures</h1>
        <p className="text-sm text-muted-foreground">
          Define tuition and other fee items. Use Edit to change amount or remove a structure.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New fee structure</CardTitle>
          </CardHeader>
          <CardContent>
            <FeeStructureForm
              sections={sections.map((s) => ({
                id: s.id,
                name: s.name,
                className: s.class.name,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              All structures ({structures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {structures.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No fee structures yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Term / period</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((fs) => (
                    <TableRow key={fs.id}>
                      <TableCell className="font-medium">{fs.name}</TableCell>
                      <TableCell>{formatGHS(fs.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{fs.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {fs.section
                          ? `${fs.section.class.name} – ${fs.section.name}`
                          : "All"}
                      </TableCell>
                      <TableCell className="text-right">
                        <EditFeeStructureForm
                          id={fs.id}
                          name={fs.name}
                          amount={fs.amount}
                          frequency={fs.frequency}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
