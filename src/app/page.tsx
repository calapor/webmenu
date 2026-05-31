"use client";

import { useState, useEffect, useRef } from "react";

type AppItem = {
  id: string;
  name: string;
  url: string;
  image?: string; // data URL or remote image URL
  icon?: string; // legacy emoji — still rendered when no image is set
};

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // keep the stored payload reasonable

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function Modal({
  item,
  onSave,
  onClose,
}: {
  item: Partial<AppItem> | null;
  onSave: (data: Omit<AppItem, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [image, setImage] = useState(item?.image ?? "");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is too large (max 1.5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }
    const normalized = url.startsWith("http") ? url.trim() : `https://${url.trim()}`;
    // Name is optional — fall back to the URL's hostname as the label.
    let label = name.trim();
    if (!label) {
      try {
        label = new URL(normalized).hostname.replace(/^www\./, "");
      } catch {
        label = normalized;
      }
    }
    onSave({ name: label, url: normalized, image: image || undefined });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-white text-xl font-semibold mb-6">
          {item?.id ? "Edit App" : "Add App"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">Name (optional)</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://myapp.local"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-gray-400 text-sm">Image (optional)</span>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 shrink-0 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="preview" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-gray-600 text-2xl">🖼️</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                >
                  Choose image…
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="px-3 py-1.5 rounded-lg text-red-400 text-sm hover:bg-red-500/10 transition-colors text-left"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 mt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppThumb({ item }: { item: AppItem }) {
  if (item.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.image} alt="" className="w-14 h-14 object-contain rounded-xl" />
    );
  }
  if (item.icon) {
    return <span className="text-4xl select-none">{item.icon}</span>;
  }
  return (
    <span className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center text-2xl font-semibold text-indigo-300 select-none">
      {(item.name.charAt(0) || "?").toUpperCase()}
    </span>
  );
}

function AppCard({
  item,
  onEdit,
  onDelete,
}: {
  item: AppItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <a
        href={item.url}
        target="app-window"
        className="flex flex-col items-center justify-center gap-3 h-40 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer"
      >
        <AppThumb item={item} />
        <span className="text-white font-medium text-sm text-center px-3 leading-tight">
          {item.name}
        </span>
      </a>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          aria-label="Edit"
          onClick={onEdit}
          className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-indigo-600 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          aria-label="Delete"
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<AppItem[]>([]);
  const [modal, setModal] = useState<{ open: boolean; item: Partial<AppItem> | null }>({
    open: false,
    item: null,
  });

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setItems(data))
      .catch(() => {});
  }, []);

  // Shared server-side store — everyone who loads the page sees the same links.
  const persist = (next: AppItem[]) => {
    setItems(next);
    fetch("/api/apps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  };

  const handleSave = (data: Omit<AppItem, "id">) => {
    if (modal.item?.id) {
      persist(items.map((i) => (i.id === modal.item!.id ? { ...i, ...data } : i)));
    } else {
      persist([...items, { id: genId(), ...data }]);
    }
    setModal({ open: false, item: null });
  };

  const handleDelete = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conductor Central</h1>
            <p className="text-gray-500 text-sm mt-1">AI Projects</p>
          </div>
          <button
            onClick={() => setModal({ open: true, item: {} })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add App
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="text-6xl">🧭</span>
            <p className="text-gray-500 text-lg">No apps yet — add your first one</p>
            <button
              onClick={() => setModal({ open: true, item: {} })}
              className="mt-2 px-5 py-2.5 rounded-xl border border-white/10 hover:border-indigo-500/50 text-gray-400 hover:text-white text-sm transition-all"
            >
              + Add App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <AppCard
                key={item.id}
                item={item}
                onEdit={() => setModal({ open: true, item })}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <Modal
          item={modal.item}
          onSave={handleSave}
          onClose={() => setModal({ open: false, item: null })}
        />
      )}
    </div>
  );
}
