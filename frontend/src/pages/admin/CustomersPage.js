import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Phone, Mail, Search } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get("/customers");
      setCustomers(data);
    } catch (e) { console.error(e); }
  };

  const filtered = customers.filter((c) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div>
        <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="customers-title">Customer Database</h2>
        <p className="text-sm text-muted-foreground mt-1">{customers.length} customers</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="customer-search-input" />
      </div>
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No customers found</CardContent></Card>
        ) : (
          filtered.map((c) => (
            <Card key={c.id} data-testid={`customer-card-${c.id}`}>
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{c.full_name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                  </div>
                  {c.whatsapp && <p className="text-xs text-muted-foreground mt-1">WhatsApp: {c.whatsapp}</p>}
                </div>
                <Badge variant="secondary" className="text-xs self-start">{c.created_at?.split("T")[0]}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
