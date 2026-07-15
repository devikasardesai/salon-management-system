import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", services: [], employees: [] });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [l, s, e] = await Promise.all([api.get("/locations/me"), api.get("/services/me"), api.get("/employees/me")]);
    setLocations(l.data);
    setServices(s.data);
    setEmployees(e.data);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", address: "", services: [], employees: [] });
    setDialogOpen(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address, services: loc.services || [], employees: loc.employees || [] });
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/locations/${editing.id}`, form);
        toast.success("Location updated");
      } else {
        await api.post("/locations", form);
        toast.success("Location added");
      }
      setDialogOpen(false);
      fetchAll();
    } catch (e) { toast.error("Failed to save"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete location?")) return;
    await api.delete(`/locations/${id}`);
    toast.success("Deleted");
    fetchAll();
  };

  const toggleService = (svcId) => {
    setForm({ ...form, services: form.services.includes(svcId) ? form.services.filter((s) => s !== svcId) : [...form.services, svcId] });
  };

  const toggleEmployee = (empId) => {
    setForm({ ...form, employees: form.employees.includes(empId) ? form.employees.filter((e) => e !== empId) : [...form.employees, empId] });
  };

  const getServiceName = (id) => services.find((s) => s.id === id)?.name || id;
  const getEmployeeName = (id) => employees.find((e) => e.id === id)?.name || id;

  return (
    <div className="space-y-6" data-testid="locations-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="locations-title">Locations</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage salon locations</p>
        </div>
        <Button onClick={openNew} data-testid="add-location-btn"><Plus className="w-4 h-4 mr-2" /> Add Location</Button>
      </div>

      <div className="grid gap-4">
        {locations.map((loc) => (
          <Card key={loc.id} data-testid={`location-card-${loc.id}`}>
            <CardContent className="py-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <h3 className="font-medium text-foreground">{loc.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-6">{loc.address}</p>
                  <div className="mt-3 ml-6 space-y-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {loc.services?.map((sid) => <Badge key={sid} variant="secondary" className="text-xs">{getServiceName(sid)}</Badge>)}
                        {(!loc.services || loc.services.length === 0) && <span className="text-xs text-muted-foreground">None assigned</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employees</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {loc.employees?.map((eid) => <Badge key={eid} variant="outline" className="text-xs">{getEmployeeName(eid)}</Badge>)}
                        {(!loc.employees || loc.employees.length === 0) && <span className="text-xs text-muted-foreground">None assigned</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(loc)} data-testid={`edit-location-${loc.id}`}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(loc.id)} data-testid={`delete-location-${loc.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Location" : "New Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="location-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Full Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="location-address-input" />
            </div>
            <div className="space-y-2">
              <Label>Available Services</Label>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <Badge key={svc.id} variant={form.services.includes(svc.id) ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => toggleService(svc.id)} data-testid={`toggle-loc-service-${svc.id}`}>
                    {svc.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned Employees</Label>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp) => (
                  <Badge key={emp.id} variant={form.employees.includes(emp.id) ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => toggleEmployee(emp.id)} data-testid={`toggle-loc-employee-${emp.id}`}>
                    {emp.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} data-testid="save-location-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
