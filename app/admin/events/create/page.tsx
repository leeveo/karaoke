"use client";

import { Suspense } from "react";
import CreateEventContent from "./CreateEventContent";

export default function CreateEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>

      <Suspense fallback={<div>Loading event form...</div>}>
        <CreateEventContent />
      </Suspense>
    </div>
  );
}
