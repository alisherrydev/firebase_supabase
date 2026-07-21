/* eslint-disable @next/next/no-img-element */
"use client"
import { useEffect, useState } from "react";
import React from "react";
import { addDoc, collection, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { db, Auth } from "@/lib/firebase.config";
import { onAuthStateChanged, User } from "firebase/auth";
import { createClient } from "@/utils/supabase/client";

interface Car {
  id: string;
  name?: string;
  color?: string;
  price?: string;
  imageUrl?: string;
  addedBy?: string;
  addedById?: string;
  [key: string]: unknown;
}

const BUCKET_NAME = 'cars_project'; // Using the gallery bucket for car images

const generateFileName = (userId: string, fileExt: string | undefined) => {
  return `${userId}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
};

export default function Home() {
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const supabase = createClient();

  const [cars, setCars] = useState<Car[]>([])
  const [loadingCars, setLoadingCars] = useState(true)
  const [carsError, setCarsError] = useState<string | null>(null)

  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(Auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Listen for realtime updates from 'cars' collection
    const unsubscribe = onSnapshot(
      collection(db, "cars"),
      (snapshot) => {
        const carsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setCars(carsData);
        setLoadingCars(false);
        setCarsError(null);
      },
      (error) => {
        console.error("Error fetching cars:", error);
        setCarsError("Failed to load cars.");
        setLoadingCars(false);
      }
    );

    // Clean up the listener on unmount
    return () => unsubscribe();
  }, []);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelFileSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleAddItem = async () => {
    if (!user) {
      setSaveError("You must be logged in to add a car.");
      return;
    }

    const trimmedInput = name.trim();
    if (!trimmedInput) return; // Prevent empty submission

    setIsSaving(true);
    setSaveError(null);

    try {
      let imageUrl = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const userId = user ? user.uid : 'guest';
        const fileName = generateFileName(userId, fileExt);
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      await addDoc(collection(db, "cars"), {
        name: trimmedInput,
        color: color,
        price: price,
        imageUrl: imageUrl, // Save image URL in Firestore
        addedBy: user.displayName || user.email || "Unknown User",
        addedById: user.uid,
        createdAt: serverTimestamp()
      });
      setName(''); // Clear only after success
      setColor('');
      setPrice('');
      cancelFileSelection();
    } catch (error: unknown) {
      console.error("Error adding item:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to add item.";
      setSaveError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  }

  const handleDeleteCar = async (id: string, addedById?: string) => {
    if (!user || user.uid !== addedById) {
      alert("You are not authorized to delete this car.");
      return;
    }
    try {
      await deleteDoc(doc(db, "cars", id));
    } catch (error) {
      console.error("Error deleting car:", error);
    }
  };

  const handleEditCar = async (id: string, addedById?: string) => {
    if (!user || user.uid !== addedById) {
      alert("You are not authorized to edit this car.");
      return;
    }
    const newName = prompt("Enter new car name:");
    const newColor = prompt("Enter new car color:");
    const newPrice = prompt("Enter new car price:");
    if (!newName || !newColor || !newPrice) return;

    try {
      await updateDoc(doc(db, "cars", id), {
        name: newName,
        color: newColor,
        price: newPrice
      });
    } catch (error) {
      console.error("Error updating car:", error);
    }
  };

  const handleGetCarById = async (id: string) => {
    try {
      const docRef = doc(db, "cars", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSelectedCar({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("No such document!");
        setSelectedCar(null);
      }
    } catch (error) {
      console.error("Error fetching car:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 text-black min-h-screen max-w-6xl mx-auto">
      {/* Add Item Section */}
      {user ? (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-col gap-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center w-full">
            <input
              type="text"
              placeholder="Enter Brand"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="flex-1 min-w-[150px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            />
            <input
              type="text"
              placeholder="Enter color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={isSaving}
              className="flex-1 min-w-[150px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            />
            <input
              type="text"
              placeholder="Enter price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSaving}
              className="flex-1 min-w-[150px] px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            />
          </div>

          <div className="flex items-center gap-4 w-full">
            <label className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium">
              Choose Image
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelection}
                disabled={isSaving}
              />
            </label>

            {previewUrl && (
              <div className="flex items-center gap-2">
                <img src={previewUrl} alt="Preview" className="h-10 w-10 object-cover rounded border border-gray-300" />
                <button
                  onClick={cancelFileSelection}
                  disabled={isSaving}
                  className="text-red-500 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="ml-auto">
              <button
                onClick={handleAddItem}
                disabled={isSaving || !name.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {isSaving ? "Adding..." : "Add Car"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">Please log in to add a car.</p>
      )}
      {saveError && <p style={{ color: 'red' }}>{saveError}</p>}

      {/* Cars List Section */}
      <h2 className="text-2xl font-bold mb-4 mt-8">Cars List</h2>
      {loadingCars && <p className="text-gray-500">Loading cars...</p>}
      {carsError && <p className="text-red-500">{carsError}</p>}
      {!loadingCars && !carsError && cars.length === 0 && <p className="text-gray-500">No cars found.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {cars.map((car) => (
          <div key={car.id} className="bg-white border border-gray-200 shadow-md rounded-xl p-3 hover:shadow-lg transition duration-200 flex flex-col text-sm">
            {car.imageUrl ? (
              <div className="mb-3 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                <img src={car.imageUrl} alt={car.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mb-3 aspect-[4/3] rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-8 h-8 mb-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">No Image</span>
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <div className="truncate pr-2">
                <h3 className="text-base font-bold text-gray-900 truncate">{car.name || 'Unknown Type'}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">Added by {car.addedBy || 'N/A'}</p>
              </div>
              <span className="shrink-0 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                ${car.price || 'N/A'}
              </span>
            </div>

            <div className="mb-3 flex-grow">
              <p className="text-xs text-gray-700">
                <span className="font-medium text-gray-900">Color:</span> {car.color || 'N/A'}
              </p>
            </div>

            <div className="flex gap-2 border-t border-gray-100 pt-3 mt-auto">
              <button onClick={() => handleGetCarById(car.id)} className="flex-1 px-2 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition text-center">
                Details
              </button>
              {user && user.uid === car.addedById && (
                <>
                  <button onClick={() => handleEditCar(car.id, car.addedById)} className="flex-1 px-2 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition text-center">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteCar(car.id, car.addedById)} className="flex-1 px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium transition text-center">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Car Details Modal */}
      {selectedCar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto flex flex-col">
            <button
              onClick={() => setSelectedCar(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Car Details</h3>

            {selectedCar.imageUrl ? (
              <div className="mb-4 h-40 sm:h-48 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                <img src={selectedCar.imageUrl} alt={selectedCar.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mb-4 h-40 sm:h-48 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-gray-400 shrink-0">
                <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">No Image Available</span>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500 font-medium">ID</span>
                <span className="text-gray-900 font-mono text-sm">{selectedCar.id}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500 font-medium">Brand</span>
                <span className="text-gray-900 font-semibold">{selectedCar.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500 font-medium">Color</span>
                <span className="text-gray-900">{selectedCar.color || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500 font-medium">Price</span>
                <span className="text-green-700 font-bold">${selectedCar.price || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-gray-500 font-medium">Added By</span>
                <span className="text-gray-900">{selectedCar.addedBy || 'N/A'}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedCar(null)}
              className="w-full py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}