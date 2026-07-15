import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { Plus, Pencil, Trash2, Phone, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaultHours = DAYS.map((d) => ({ day: d, start: "09:00", end: "18:00", is_off: d === "Sunday" }));

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", location: "", expertise: [], working_hours: defaultHours });
  const [expertiseInput, setExpertiseInput] = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [e, l] = await Promise.all([api.get("/employees/me"), api.get("/locations/me")]);
    setEmployees(e.data);
    setLocations(l.data);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", location: "", expertise: [], working_hours: [...defaultHours] });
    setDialogOpen(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      name: emp.name, email: emp.email || "", phone: emp.phone || "",
      location: emp.location || "", expertise: emp.expertise || [],
      working_hours: emp.working_hours?.length ? emp.working_hours : [...defaultHours]
    });
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, form);
        toast.success("Employee updated");
      } else {
        await api.post("/employees", form);
        toast.success("Employee added");
      }
      setDialogOpen(false);
      fetchAll();
    } catch (e) { toast.error("Failed to save"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete employee?")) return;
    await api.delete(`/employees/${id}`);
    toast.success("Deleted");
    fetchAll();
  };

  const addExpertise = () => {
    if (expertiseInput.trim() && !form.expertise.includes(expertiseInput.trim())) {
      setForm({ ...form, expertise: [...form.expertise, expertiseInput.trim()] });
      setExpertiseInput("");
    }
  };

  const removeExpertise = (item) => {
    setForm({ ...form, expertise: form.expertise.filter((e) => e !== item) });
  };

  const updateWorkingHours = (idx, key, val) => {
    const updated = [...form.working_hours];
    updated[idx] = { ...updated[idx], [key]: val };
    setForm({ ...form, working_hours: updated });
  };

  const getLocationName = (id) => locations.find((l) => l.id === id)?.name || "Not assigned";

  return (
    <div className="space-y-6" data-testid="employees-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="employees-title">Employees</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your team</p>
        </div>
        <Button onClick={openNew} data-testid="add-employee-btn"><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {employees.map((emp) => (
          <Card key={emp.id} data-testid={`employee-card-${emp.id}`}>
            <CardContent className="py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-foreground">{emp.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Mail className="w-3 h-3" /> {emp.email || "N/A"}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {emp.phone || "N/A"}</p>
                  <p className="text-sm text-muted-foreground mt-1">Location: {getLocationName(emp.location)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {emp.expertise?.map((e, i) => <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>)}
                  </div>
                  {emp.working_hours?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {emp.working_hours.filter((h) => !h.is_off).length} working days
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} data-testid={`edit-employee-${emp.id}`}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(emp.id)} data-testid={`delete-employee-${emp.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Employee" : "New Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="employee-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="employee-email-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+919876543210" data-testid="employee-phone-input" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} data-testid="employee-location-select">
                  <option value="">Select Location</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {/* Expertise */}
            <div className="space-y-2">
              <Label>Areas of Expertise</Label>
              <div className="flex gap-2">
                <Input value={expertiseInput} onChange={(e) => setExpertiseInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExpertise())} placeholder="Add expertise..." data-testid="expertise-input" />
                <Button type="button" variant="outline" onClick={addExpertise} data-testid="add-expertise-btn">Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.expertise.map((e, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeExpertise(e)}>
                    {e} <span className="ml-1 text-xs">&times;</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div className="space-y-3">
              <Label className="text-base">Working Hours</Label>
              {form.working_hours.map((wh, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border border-border rounded-lg" data-testid={`working-hours-${wh.day.toLowerCase()}`}>
                  <span className="w-24 text-sm font-medium">{wh.day}</span>
                  <Switch checked={!wh.is_off} onCheckedChange={(checked) => updateWorkingHours(i, "is_off", !checked)} />
                  {!wh.is_off && (
                    <>
                      <Input type="time" className="w-28" value={wh.start} onChange={(e) => updateWorkingHours(i, "start", e.target.value)} />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input type="time" className="w-28" value={wh.end} onChange={(e) => updateWorkingHours(i, "end", e.target.value)} />
                    </>
                  )}
                  {wh.is_off && <span className="text-sm text-muted-foreground">Day Off</span>}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} data-testid="save-employee-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
