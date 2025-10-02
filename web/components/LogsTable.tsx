import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";

interface Log {
  id: number;
  orderDate: string;
  gross: number;
  tips: number;
  mileage: number | null;
  parsedAt: string;
}

interface LogsTableProps {
  logs: Log[];
}

export default function LogsTable({ logs }: LogsTableProps) {
  if (logs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
          </div>
          <div>
            <p className="font-semibold mb-2">No logs yet</p>
            <p className="text-sm text-muted-foreground">
              Forward your payout emails to get started tracking your earnings
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Tips</TableHead>
              <TableHead>Mileage</TableHead>
              <TableHead>Parsed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {new Date(log.orderDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-primary font-semibold">
                  ${log.gross.toFixed(2)}
                </TableCell>
                <TableCell className="text-primary">
                  ${log.tips.toFixed(2)}
                </TableCell>
                <TableCell>
                  {log.mileage ? `${log.mileage.toFixed(1)} mi` : '-'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(log.parsedAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
