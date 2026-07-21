"use client"
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

import { db, Auth } from '@/lib/firebase.config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';

const BUCKET_NAME = 'gallary_project';

interface UploadedImage {
  id: string;
  name: string;
  url: string;
  size: number;
  addedById: string;
}

export default function GalleryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(Auth, (currentUser) => {
      setUser(currentUser);
    });

    // Listen to firestore gallery collection
    const unsubscribeGallery = onSnapshot(
      collection(db, "gallery"),
      (snapshot) => {
        const imageList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as UploadedImage[];
        setImages(imageList);
        setError(null);
      },
      (err) => {
        console.error("Error fetching images:", err);
        setError("Failed to load images from Firestore.");
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeGallery();
    };
  }, []);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setSelectedFiles(newFiles);

    // Generate preview URLs
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(newPreviewUrls);
  };

  const handleUploadToSupabase = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const userId = user ? user.uid : 'guest';
        const fileName = `${userId}_${Date.now().toString(36)}.${fileExt}`;

        const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file);
        if (error) throw error;

        // Get public URL
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

        // Save to Firestore
        await addDoc(collection(db, 'gallery'), {
          name: fileName,
          url: publicUrlData.publicUrl,
          size: file.size,
          addedById: userId,
          createdAt: serverTimestamp()
        });
      }

      // Clear selection after upload
      setSelectedFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload image.';
      console.error('Error uploading image:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelSelection = () => {
    setSelectedFiles([]);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  const handleDeleteImage = async (img: UploadedImage) => {
    if (!user || user.uid !== img.addedById) {
      alert("You are not authorized to delete this image.");
      return;
    }

    if (!confirm('Are you sure you want to delete this image?')) return;

    setError(null);
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([img.name]);
      if (error) throw error;

      // Delete from Firestore
      await deleteDoc(doc(db, 'gallery', img.id));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete image.';
      console.error('Error deleting image:', errorMsg);
      setError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gallery</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Upload Section */}
        {user ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-10">
            {selectedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 bg-gray-50 hover:bg-gray-100 transition cursor-pointer relative">
                <p className="text-gray-600 font-medium mb-1">Click to select files or drag and drop</p>
                <p className="text-xs text-gray-500 mb-4">SVG, PNG, JPG or GIF</p>

                <input
                  id="file-upload"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelection}
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium inline-block text-center"
                >
                  Select Files
                </label>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Selected Files Preview</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-6">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelSelection}
                    disabled={isUploading}
                    className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadToSupabase}
                    disabled={isUploading}
                    className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      'Upload to Supabase'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 mb-10 p-6 bg-white rounded-xl border border-gray-100 text-center shadow-sm">Please log in to add images.</p>
        )}

        {/* Image Grid Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Uploads ({images.length})</h2>

          {images.length === 0 && !error ? (
            <p className="text-gray-500 text-center py-10 bg-white rounded-lg border border-gray-100">No images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 group cursor-pointer transform hover:-translate-y-1 transition duration-300 flex flex-col"
                  onClick={() => setSelectedImage(img)}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-white bg-black/50 px-3 py-1 rounded-full text-xs font-medium mb-3 backdrop-blur-sm">View Full Screen</span>
                      {user && img.addedById === user.uid && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                          className="p-2.5 bg-white text-red-500 rounded-full hover:bg-red-50 hover:text-red-600 shadow-lg transform hover:scale-110 transition"
                          title="Delete Image"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-800 truncate" title={img.name}>{img.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{((img.size || 0) / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 md:p-8 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition z-10"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="relative w-full max-w-6xl max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
            <span className="bg-black/60 text-white/90 px-4 py-2 rounded-full text-sm backdrop-blur-md">
              {selectedImage.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
