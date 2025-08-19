import React, { useCallback } from 'react';
import { ImageUp } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  onImageSelect: (image: File) => void;
}

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file) {
        // Create FormData and upload the image
        const formData = new FormData();
        formData.append('image', file);

        try {
          const response = await fetch('/api/image/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload image');
          }

          const result = await response.json();
          if (result.success && result.imageUrl) {
            // Pass the file to parent component
            onImageSelect(file);
          } else {
            throw new Error(result.error || 'Failed to process image');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          // You might want to show an error message to the user here
        }
      }
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxSize: 5 * 1024 * 1024 // 5MB limit
  });

  return (
    <div {...getRootProps()} className="cursor-pointer">
      <input {...getInputProps()} />
      <div className="space-y-1">
        <ImageUp className="h-8 w-8 text-foreground" />
      </div>
    </div>
  );
} 