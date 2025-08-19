export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessedLocation {
  component: string;
  selector: string;
  confidence: number;
  boundingBox: BoundingBox | null;
  context: {
    parentComponent: string;
    nearbyElements: string[];
    currentStyles: string[];
  };
} 