import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", price: 0, duration_minutes: 30, category: "", description: "", add_ons: [], locations: [], employees: [] });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [s, l, e] = await Promise.all([api.get("/services"), api.get("/locations"), api.get("/employees")]);
    setServices(s.data);
    setLocations(l.data);
    setEmployees(e.data);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", price: 0, duration_minutes: 30, category: "", description: "", add_ons: [], locations: [], employees: [] });
    setDialogOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({ name: svc.name, price: svc.price, duration_minutes: svc.duration_minutes, category: svc.category || "", description: svc.description || "", add_ons: svc.add_ons || [], locations: svc.locations || [], employees: svc.employees || [] });
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/services/${editing.id}`, form);
        toast.success("Service updated");
      } else {
        await api.post("/services", form);
        toast.success("Service created");
      }
      setDialogOpen(false);
      fetchAll();
    } catch (e) {
      toast.error("Failed to save service");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    await api.delete(`/services/${id}`);
    toast.success("Service deleted");
    fetchAll();
  };

  const addAddOn = () => {
    setForm({ ...form, add_ons: [...form.add_ons, { id: Date.now().toString(), name: "", price: 0, duration_minutes: 0 }] });
  };

  const updateAddOn = (idx, key, val) => {
    const updated = [...form.add_ons];
    updated[idx] = { ...updated[idx], [key]: val };
    setForm({ ...form, add_ons: updated });
  };

  const removeAddOn = (idx) => {
    setForm({ ...form, add_ons: form.add_ons.filter((_, i) => i !== idx) });
  };

  const toggleLocation = (locId) => {
    setForm({ ...form, locations: form.locations.includes(locId) ? form.locations.filter((l) => l !== locId) : [...form.locations, locId] });
  };

  const toggleEmployee = (empId) => {
    setForm({ ...form, employees: form.employees.includes(empId) ? form.employees.filter((e) => e !== empId) : [...form.employees, empId] });
  };

  const getLocationName = (id) => locations.find((l) => l.id === id)?.name || id;
  const getEmployeeName = (id) => employees.find((e) => e.id === id)?.name || id;

  return (
    <div className="space-y-6" data-testid="services-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="services-title">Services</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your salon services</p>
        </div>
        <Button onClick={openNew} data-testid="add-service-btn"><Plus className="w-4 h-4 mr-2" /> Add Service</Button>
      </div>

      <div className="grid gap-4">
        {services.map((svc) => (
          <Card key={svc.id} data-testid={`service-card-${svc.id}`}>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground">{svc.name}</h3>
                    {svc.category && <Badge variant="secondary" className="text-xs">{svc.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{svc.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-semibold text-primary">&#8377;{svc.price}</span>
                    <span className="text-muted-foreground">{svc.duration_minutes} min</span>
                  </div>
                  {svc.add_ons?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {svc.add_ons.map((ao, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ao.name} &middot; &#8377;{ao.price} &middot; {ao.duration_minutes}min
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {svc.locations?.map((lid) => <Badge key={lid} variant="secondary" className="text-xs">{getLocationName(lid)}</Badge>)}
                    {svc.employees?.map((eid) => <Badge key={eid} variant="outline" className="text-xs">{getEmployeeName(eid)}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(svc)} data-testid={`edit-service-${svc.id}`}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(svc.id)} data-testid={`delete-service-${svc.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="service-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Hair, Skin, Nails" data-testid="service-category-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="service-description-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (&#8377;)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} data-testid="service-price-input" />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} data-testid="service-duration-input" />
              </div>
            </div>

            {/* Add-ons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Add-ons / Sub-products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAddOn} data-testid="add-addon-btn"><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              {form.add_ons.map((ao, i) => (
                <div key={i} className="flex items-end gap-2 p-3 border border-border rounded-lg bg-secondary/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={ao.name} onChange={(e) => updateAddOn(i, "name", e.target.value)} data-testid={`addon-name-${i}`} />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Price (&#8377;)</Label>
                    <Input type="number" value={ao.price} onChange={(e) => updateAddOn(i, "price", parseFloat(e.target.value) || 0)} data-testid={`addon-price-${i}`} />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Min</Label>
                    <Input type="number" value={ao.duration_minutes} onChange={(e) => updateAddOn(i, "duration_minutes", parseInt(e.target.value) || 0)} data-testid={`addon-duration-${i}`} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAddOn(i)} data-testid={`remove-addon-${i}`}><X className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>

            {/* Locations */}
            <div className="space-y-2">
              <Label>Available at Locations</Label>
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <Badge
                    key={loc.id}
                    variant={form.locations.includes(loc.id) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleLocation(loc.id)}
                    data-testid={`toggle-location-${loc.id}`}
                  >
                    {loc.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Employees */}
            <div className="space-y-2">
              <Label>Assigned Employees</Label>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp) => (
                  <Badge
                    key={emp.id}
                    variant={form.employees.includes(emp.id) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleEmployee(emp.id)}
                    data-testid={`toggle-employee-${emp.id}`}
                  >
                    {emp.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} data-testid="save-service-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
