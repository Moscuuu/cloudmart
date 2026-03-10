import { useState } from 'react';
import { PLACEHOLDER_IMAGE_BASE } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  productId: string;
  productName: string;
}

function generateImageUrls(productId: string): string[] {
  return [
    `${PLACEHOLDER_IMAGE_BASE}/${productId}-1/600/600`,
    `${PLACEHOLDER_IMAGE_BASE}/${productId}-2/600/600`,
    `${PLACEHOLDER_IMAGE_BASE}/${productId}-3/600/600`,
    `${PLACEHOLDER_IMAGE_BASE}/${productId}-4/600/600`,
  ];
}

export function ProductImageGallery({ productId, productName }: ProductImageGalleryProps) {
  const images = generateImageUrls(productId);
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="overflow-hidden rounded-xl border">
        <img
          src={images[selectedIndex]}
          alt={productName}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-2">
        {images.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={cn(
              'min-h-[44px] cursor-pointer overflow-hidden rounded-lg border-2 transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
              index === selectedIndex
                ? 'border-primary'
                : 'border-transparent hover:border-muted-foreground/30',
            )}
            aria-label={`View image ${index + 1} of ${images.length}`}
            aria-pressed={index === selectedIndex}
          >
            <img
              src={url}
              alt={`${productName} - view ${index + 1}`}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
