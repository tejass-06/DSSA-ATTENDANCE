"use client";

import React, { useState, useTransition } from "react";
import {
  Building,
  MapPin,
  Radio,
  Plus,
  Edit2,
  Power,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { AdminBadge } from "./AdminBadge";
import {
  createRoomAction,
  updateRoomAction,
  toggleRoomActiveAction,
} from "@/app/admin/rooms/actions";

export interface RoomItem {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string | Date;
  _count: {
    sessions: number;
  };
}

interface RoomManagerProps {
  initialRooms: RoomItem[];
}

export function RoomManager({ initialRooms }: RoomManagerProps) {
  const rooms = initialRooms;
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    latitude: "21.1278000",
    longitude: "79.0528000",
    radiusMeters: "30",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      latitude: "21.1278000",
      longitude: "79.0528000",
      radiusMeters: "30",
    });
    setErrorMessage(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (room: RoomItem) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      code: room.code,
      latitude: room.latitude.toString(),
      longitude: room.longitude.toString(),
      radiusMeters: room.radiusMeters.toString(),
    });
    setErrorMessage(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    const rad = parseInt(formData.radiusMeters, 10);

    startTransition(async () => {
      const res = await createRoomAction({
        name: formData.name,
        code: formData.code,
        latitude: lat,
        longitude: lon,
        radiusMeters: rad,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create room.");
      } else {
        setSuccessMessage("Room registered successfully.");
        setIsCreateOpen(false);
        resetForm();
        // Optimistic refresh
        window.location.reload();
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    const rad = parseInt(formData.radiusMeters, 10);

    startTransition(async () => {
      const res = await updateRoomAction(editingRoom.id, {
        name: formData.name,
        latitude: lat,
        longitude: lon,
        radiusMeters: rad,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update room.");
      } else {
        setSuccessMessage("Room details updated successfully.");
        setEditingRoom(null);
        resetForm();
        window.location.reload();
      }
    });
  };

  const handleToggleActive = (room: RoomItem) => {
    const target = !room.isActive;
    const confirmMsg = target
      ? `Re-activate room "${room.name}"?`
      : `Deactivate room "${room.name}"? Inactive rooms will not allow new attendance sessions.`;

    if (!confirm(confirmMsg)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await toggleRoomActiveAction(room.id, target);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to update status.");
      } else {
        setSuccessMessage(`Room status updated to ${target ? "ACTIVE" : "INACTIVE"}.`);
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {successMessage && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-mono text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-1.5 text-xs font-mono text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-mono font-medium text-white transition-colors self-start sm:self-auto shadow-lg shadow-purple-900/20"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Room</span>
        </button>
      </div>

      {/* Room Table / Cards */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-4 sm:px-6">Room Name</th>
                <th className="py-3.5 px-4 sm:px-6">Room Code</th>
                <th className="py-3.5 px-4 sm:px-6">GPS Center</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Radius</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Sessions</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {rooms.map((room) => {
                const latStr = Number(room.latitude).toFixed(6);
                const lngStr = Number(room.longitude).toFixed(6);

                return (
                  <tr
                    key={room.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-medium text-white">{room.name}</div>
                      <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[140px]">
                        ID: {room.id}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-cyan-300">
                      <span className="rounded bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5">
                        {room.code}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                        <span>
                          {latStr}, {lngStr}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center font-mono text-zinc-400">
                      <span className="rounded-md bg-zinc-900 px-2 py-1">
                        {room.radiusMeters}m
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center font-mono text-zinc-300">
                      <span className="inline-flex items-center gap-1">
                        <Radio className="h-3 w-3 text-purple-400" />
                        <span>{room._count.sessions}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <AdminBadge
                        type={room.isActive ? "ACTIVE_ROOM" : "INACTIVE_ROOM"}
                        label={room.isActive ? "ACTIVE" : "INACTIVE"}
                      />
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(room)}
                          className="p-1.5 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                          title="Edit Room"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(room)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            room.isActive
                              ? "border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50"
                              : "border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50"
                          }`}
                          title={room.isActive ? "Deactivate Room" : "Activate Room"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Room Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f19] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="h-4 w-4 text-purple-400" />
                <span>Register Physical Room</span>
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DSSA Committee Room"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Room Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DSSA-ROOM-02"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Latitude [-90, 90] *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Longitude [-180, 180] *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Geofence Radius (meters) [5 - 500] *
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  required
                  value={formData.radiusMeters}
                  onChange={(e) =>
                    setFormData({ ...formData, radiusMeters: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Enforced server-side during attendance verification.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-white font-semibold disabled:opacity-50"
                >
                  {isPending ? "Registering..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f19] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-cyan-400" />
                <span>Edit Room: {editingRoom.code}</span>
              </h2>
              <button
                onClick={() => setEditingRoom(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Radius (meters) [5 - 500] *
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  required
                  value={formData.radiusMeters}
                  onChange={(e) =>
                    setFormData({ ...formData, radiusMeters: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-white font-semibold disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
