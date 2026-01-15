import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";

const AdminHackathons = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [difficulty, setDifficulty] = useState("beginner");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerLogo, setOrganizerLogo] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");

  // advanced fields
  const [theme, setTheme] = useState("");
  const [tracks, setTracks] = useState<string[]>([]);
  const [newTrack, setNewTrack] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [prizes, setPrizes] = useState<{
    first?: string;
    second?: string;
    third?: string;
  }>({});
  const [participantsMax, setParticipantsMax] = useState<number>(0);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [schedule, setSchedule] = useState<any[]>([]);
  const [newScheduleDay, setNewScheduleDay] = useState("");
  const [newScheduleItems, setNewScheduleItems] = useState("");
  const [judges, setJudges] = useState<any[]>([]);
  const [newJudgeName, setNewJudgeName] = useState("");
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [newSponsorName, setNewSponsorName] = useState("");
  const [locationType, setLocationType] = useState("hybrid");
  const [locationVenue, setLocationVenue] = useState("");
  const [locationCity, setLocationCity] = useState("");

  // admin's hackathons
  const [myHackathons, setMyHackathons] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u && (u.role === "platform_admin" || u.role === "instructor")) {
        setIsAdmin(true);
        // load hackathons created by this admin
        loadMyHackathons(u.username);
      }
    } catch {}
  }, []);

  const previewHackathon = useMemo(() => {
    return {
      title: title || "New Hackathon",
      description,
      organizer: {
        name: organizerName || "Organizer",
        logo: organizerLogo || "",
      },
      status,
      startDate,
      endDate,
      registrationDeadline,
      theme,
      tracks,
      prizes,
      participants: { registered: 0, maxCapacity: participantsMax, teams: 0 },
      registrationUrl: registrationUrl || undefined,
      difficulty,
      tags,
      requirements,
      schedule,
      judges,
      sponsors,
      location: {
        type: locationType,
        venue: locationVenue,
        city: locationCity,
      },
    };
  }, [
    title,
    description,
    organizerName,
    organizerLogo,
    status,
    startDate,
    endDate,
    registrationDeadline,
    theme,
    tracks,
    prizes,
    participantsMax,
    difficulty,
    tags,
    requirements,
    schedule,
    judges,
    sponsors,
    locationType,
    locationVenue,
    locationCity,
    registrationUrl,
  ]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  async function loadMyHackathons(username?: string) {
    try {
      setLoading(true);
      const api = await import("@/lib/api");
      const resp = await api.apiFetch("/api/hackathons");
      const d = await resp.json().catch(() => null);
      const items =
        d && d.data && Array.isArray(d.data.items)
          ? d.data.items
          : Array.isArray(d)
            ? d
            : [];
      if (username) {
        setMyHackathons(items.filter((h: any) => h.created_by === username));
      } else {
        const u = JSON.parse(localStorage.getItem("user") || "null");
        setMyHackathons(
          items.filter((h: any) => h.created_by === (u && u.username)),
        );
      }
    } catch (e) {
      console.error("Failed to load admin hackathons", e);
      setMyHackathons([]);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setRegistrationDeadline("");
    setStatus("upcoming");
    setDifficulty("beginner");
    setOrganizerName("");
    setOrganizerLogo("");
    setTheme("");
    setTracks([]);
    setTags([]);
    setPrizes({});
    setParticipantsMax(0);
    setRequirements([]);
    setSchedule([]);
    setJudges([]);
    setSponsors([]);
    setLocationType("hybrid");
    setLocationVenue("");
    setLocationCity("");
    setRegistrationUrl("");
  };

  const handleCreate = async () => {
    setError(null);
    if (!title) return setError("Title is required");
    setLoading(true);
    try {
      const api = await import("@/lib/api");
      const body: any = {
        title,
        description,
        startDate,
        endDate,
        registrationDeadline,
        status,
        difficulty,
        theme,
        tracks,
        prizes,
        participants: { maxCapacity: participantsMax },
        tags,
        requirements,
        schedule,
        judges,
        sponsors,
        location: {
          type: locationType,
          venue: locationVenue,
          city: locationCity,
        },
        organizer: {
          name: organizerName || undefined,
          logo: organizerLogo || undefined,
        },
        registrationUrl: registrationUrl || undefined,
      };

      const url = editingId
        ? `/api/hackathons/${editingId}`
        : "/api/hackathons/create";
      const method = editingId ? "PUT" : "POST";
      const resp = await api.apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let d: any = null;
      try {
        d = await resp.json();
      } catch {
        d = null;
      }
      if (resp.ok && d?.success) {
        const id = d.data?.id || d.data?.hackathon?._id;
        alert(editingId ? "Hackathon updated" : "Hackathon created");
        await loadMyHackathons();
        if (!editingId) navigate(`/hackathon/${id}`);
        else resetForm();
      } else {
        console.error("Create/update hackathon failed", {
          status: resp.status,
          body: d,
        });
        setError(
          (d && d.message) || `Operation failed (status ${resp.status})`,
        );
      }
    } catch (e: any) {
      console.error(e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (h: any) => {
    setEditingId(h._id || h.id || null);
    setTitle(h.title || "");
    setDescription(h.description || "");
    setStartDate(h.startDate || "");
    setEndDate(h.endDate || "");
    setRegistrationDeadline(h.registrationDeadline || "");
    setStatus(h.status || "upcoming");
    setDifficulty(h.difficulty || "beginner");
    setOrganizerName((h.organizer && h.organizer.name) || "");
    setOrganizerLogo((h.organizer && h.organizer.logo) || "");
    setRegistrationUrl(h.registrationUrl || h.registration_url || "");
    setTheme(h.theme || "");
    setTracks(h.tracks || []);
    setTags(h.tags || []);
    setPrizes(h.prizes || {});
    setParticipantsMax((h.participants && h.participants.maxCapacity) || 0);
    setRequirements(h.requirements || []);
    setSchedule(h.schedule || []);
    setJudges(h.judges || []);
    setSponsors(h.sponsors || []);
    setLocationType((h.location && h.location.type) || "hybrid");
    setLocationVenue((h.location && h.location.venue) || "");
    setLocationCity((h.location && h.location.city) || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (h: any) => {
    if (!confirm("Delete this hackathon?")) return;
    try {
      setLoading(true);
      const api = await import("@/lib/api");
      const id = h._id || h.id;
      const resp = await api.apiFetch(`/api/hackathons/${id}`, {
        method: "DELETE",
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok && d?.success) {
        alert("Deleted");
        await loadMyHackathons();
      } else {
        setError((d && d.message) || `Delete failed (status ${resp.status})`);
      }
    } catch (e: any) {
      console.error(e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => resetForm();

  if (!isAdmin)
    return (
      <Layout>
        <div className="container py-8">
          <h2 className="text-xl font-semibold mb-4">
            Admin - Create Hackathon
          </h2>
          <p className="text-muted-foreground">
            You must be an admin to access this page. Please sign in with an
            admin account.
          </p>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="container py-8">
        <h2 className="text-2xl font-bold mb-4">
          {editingId ? "Edit Hackathon" : "Create Hackathon (Admin)"}
        </h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e: any) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Theme</Label>
                    <Input
                      value={theme}
                      onChange={(e: any) => setTheme(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Organizer Name</Label>
                    <Input
                      value={organizerName}
                      onChange={(e: any) => setOrganizerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Organizer Logo URL</Label>
                    <Input
                      value={organizerLogo}
                      onChange={(e: any) => setOrganizerLogo(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Registration / Proceed URL</Label>
                    <Input
                      placeholder="https://example.com/register"
                      value={registrationUrl}
                      onChange={(e: any) => setRegistrationUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Start Date (ISO)</Label>
                    <Input
                      value={startDate}
                      onChange={(e: any) => setStartDate(e.target.value)}
                      placeholder="2024-03-15T09:00:00Z"
                    />
                  </div>
                  <div>
                    <Label>End Date (ISO)</Label>
                    <Input
                      value={endDate}
                      onChange={(e: any) => setEndDate(e.target.value)}
                      placeholder="2024-03-17T18:00:00Z"
                    />
                  </div>
                  <div>
                    <Label>Registration Deadline</Label>
                    <Input
                      value={registrationDeadline}
                      onChange={(e: any) =>
                        setRegistrationDeadline(e.target.value)
                      }
                      placeholder="2024-03-10T23:59:59Z"
                    />
                  </div>
                  <div>
                    <Label>Location Type</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={locationType}
                      onChange={(e) => setLocationType(e.target.value)}
                    >
                      <option value="online">online</option>
                      <option value="onsite">onsite</option>
                      <option value="hybrid">hybrid</option>
                    </select>
                  </div>
                  <div>
                    <Label>Venue</Label>
                    <Input
                      value={locationVenue}
                      onChange={(e: any) => setLocationVenue(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={locationCity}
                      onChange={(e: any) => setLocationCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="beginner">beginner</option>
                      <option value="intermediate">intermediate</option>
                      <option value="advanced">advanced</option>
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="upcoming">upcoming</option>
                      <option value="ongoing">ongoing</option>
                      <option value="completed">completed</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e: any) => setDescription(e.target.value)}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tracks</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTrack}
                        onChange={(e: any) => setNewTrack(e.target.value)}
                        placeholder="Add track"
                      />
                      <Button
                        onClick={() => {
                          if (newTrack.trim()) {
                            setTracks((prev) => [...prev, newTrack.trim()]);
                            setNewTrack("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tracks.map((t, idx) => (
                        <Badge
                          key={idx}
                          onClick={() =>
                            setTracks((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="cursor-pointer"
                        >
                          {t} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e: any) => setNewTag(e.target.value)}
                        placeholder="Add tag"
                      />
                      <Button
                        onClick={() => {
                          if (newTag.trim()) {
                            setTags((prev) => [...prev, newTag.trim()]);
                            setNewTag("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map((t, idx) => (
                        <Badge
                          key={idx}
                          onClick={() =>
                            setTags((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="cursor-pointer"
                        >
                          {t} ×
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4">
                      <Label>Requirements</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newRequirement}
                          onChange={(e: any) =>
                            setNewRequirement(e.target.value)
                          }
                          placeholder="Add requirement"
                        />
                        <Button
                          onClick={() => {
                            if (newRequirement.trim()) {
                              setRequirements((prev) => [
                                ...prev,
                                newRequirement.trim(),
                              ]);
                              setNewRequirement("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                        {requirements.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Prizes</Label>
                    <Input
                      placeholder="First prize e.g. ₹1,00,000"
                      value={prizes.first || ""}
                      onChange={(e: any) =>
                        setPrizes((p) => ({ ...p, first: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Second prize"
                      value={prizes.second || ""}
                      onChange={(e: any) =>
                        setPrizes((p) => ({ ...p, second: e.target.value }))
                      }
                      className="mt-2"
                    />
                    <Input
                      placeholder="Third prize"
                      value={prizes.third || ""}
                      onChange={(e: any) =>
                        setPrizes((p) => ({ ...p, third: e.target.value }))
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Participants max capacity</Label>
                    <Input
                      type="number"
                      value={participantsMax || 0}
                      onChange={(e: any) =>
                        setParticipantsMax(Number(e.target.value))
                      }
                    />

                    <div className="mt-4">
                      <Label>Judges</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newJudgeName}
                          onChange={(e: any) => setNewJudgeName(e.target.value)}
                          placeholder="Judge name"
                        />
                        <Button
                          onClick={() => {
                            if (newJudgeName.trim()) {
                              setJudges((prev) => [
                                ...prev,
                                { name: newJudgeName.trim() },
                              ]);
                              setNewJudgeName("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                        {judges.map((j, idx) => (
                          <li key={idx}>{j.name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Schedule</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Day label e.g. Day 1"
                      value={newScheduleDay}
                      onChange={(e: any) => setNewScheduleDay(e.target.value)}
                    />
                    <Input
                      placeholder="Activities (comma separated)"
                      value={newScheduleItems}
                      onChange={(e: any) => setNewScheduleItems(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        if (newScheduleDay.trim()) {
                          setSchedule((prev) => [
                            ...prev,
                            {
                              day: newScheduleDay.trim(),
                              items: newScheduleItems
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          ]);
                          setNewScheduleDay("");
                          setNewScheduleItems("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {schedule.map((s, idx) => (
                      <div key={idx}>
                        <strong>{s.day}</strong>
                        <div className="text-sm text-muted-foreground">
                          {(s.items || []).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Sponsors</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Sponsor name"
                      value={newSponsorName}
                      onChange={(e: any) => setNewSponsorName(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        if (newSponsorName.trim()) {
                          setSponsors((prev) => [
                            ...prev,
                            { name: newSponsorName.trim() },
                          ]);
                          setNewSponsorName("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sponsors.map((s, idx) => (
                      <Badge key={idx}>{s.name}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex gap-2">
              <Button onClick={handleCreate} disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingId
                    ? "Update Hackathon"
                    : "Create Hackathon"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (editingId) handleCancelEdit();
                  else navigate(-1);
                }}
              >
                {editingId ? "Cancel Edit" : "Cancel"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">Preview</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {previewHackathon.organizer.logo ? (
                      <img
                        src={previewHackathon.organizer.logo}
                        className="h-12 w-12 object-contain"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-semibold">
                        {(previewHackathon.organizer.name || "O")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-lg">
                        {previewHackathon.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {previewHackathon.organizer.name} •{" "}
                        {previewHackathon.location.city || "-"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {previewHackathon.description}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Badge className={getStatusColor(previewHackathon.status)}>
                      {previewHackathon.status}
                    </Badge>
                    <Badge
                      className={getDifficultyColor(
                        previewHackathon.difficulty,
                      )}
                    >
                      {previewHackathon.difficulty}
                    </Badge>
                    {previewHackathon.tracks
                      .slice(0, 3)
                      .map((t: any, i: number) => (
                        <Badge key={i}>{t}</Badge>
                      ))}
                  </div>

                  <div className="mt-3">
                    <p className="text-sm">
                      Start: {previewHackathon.startDate || "-"}
                    </p>
                    <p className="text-sm">
                      End: {previewHackathon.endDate || "-"}
                    </p>
                    <p className="text-sm">
                      Registration closes:{" "}
                      {previewHackathon.registrationDeadline || "-"}
                    </p>
                    <p className="text-sm">
                      Capacity: {previewHackathon.participants.maxCapacity || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h4 className="font-semibold">Your Hackathons</h4>
                <div className="mt-2 space-y-2">
                  {myHackathons.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      You have not created any hackathons yet.
                    </div>
                  ) : (
                    myHackathons.map((h) => (
                      <div
                        key={h._id || h.id}
                        className="p-2 border rounded flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold">{h.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {h.status} •{" "}
                            {h.startDate
                              ? new Date(h.startDate).toLocaleDateString()
                              : "-"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(h)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(h)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h4 className="font-semibold">Quick Links</h4>
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin/hackathons")}
                  >
                    Refresh List
                  </Button>
                  <Button variant="outline">View Submissions</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminHackathons;
