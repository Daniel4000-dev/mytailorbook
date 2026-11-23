export interface AtelierCustomStyle {
  name: string;
  photoUrl?: string;
  gender?: 'male' | 'female';
  basePrice?: number;
  measurementFields?: { id: string; label: string }[];
}

export const MOCK_ATELIER_STYLES: AtelierCustomStyle[] = [
  {
    name: 'Royal 3-Piece Agbada',
    photoUrl: '/images/garments/agbada-male.jpg',
    gender: 'male',
    basePrice: 55000,
    measurementFields: [
      { id: 'agbada_length', label: 'Agbada Outer Length' },
      { id: 'buba_length', label: 'Inner Buba Length' },
      { id: 'chest', label: 'Chest Around' },
      { id: 'shoulder', label: 'Shoulder Width' },
      { id: 'sleeve', label: 'Sleeve Length' },
      { id: 'trouser_length', label: 'Sokoto Trouser Length' },
      { id: 'waist', label: 'Trouser Waist' },
    ],
  },
  {
    name: 'Executive Senator Kaftan',
    photoUrl: '/images/garments/senator-male.jpg',
    gender: 'male',
    basePrice: 30000,
    measurementFields: [
      { id: 'top_length', label: 'Top Tunic Length' },
      { id: 'chest', label: 'Chest Around' },
      { id: 'neck', label: 'Collar Neck' },
      { id: 'shoulder', label: 'Shoulder Width' },
      { id: 'trouser_length', label: 'Trouser Length' },
      { id: 'thigh', label: 'Thigh Around' },
    ],
  },
  {
    name: 'Double-Breasted Savile Suit',
    photoUrl: '/images/garments/suit-male.jpg',
    gender: 'male',
    basePrice: 85000,
    measurementFields: [
      { id: 'chest', label: 'Chest Around' },
      { id: 'waist', label: 'Jacket Waist' },
      { id: 'jacket_length', label: 'Jacket Length' },
      { id: 'shoulder', label: 'Shoulder to Shoulder' },
      { id: 'lapel', label: 'Peak Lapel Width' },
      { id: 'trouser_length', label: 'Trouser Length' },
      { id: 'inseam', label: 'Trouser Inseam' },
      { id: 'hips', label: 'Hips Around' },
    ],
  },
  {
    name: 'Corset Mermaid Gown',
    photoUrl: '/images/garments/aso-ebi-gown-female.jpg',
    gender: 'female',
    basePrice: 65000,
    measurementFields: [
      { id: 'bust', label: 'Bust Around' },
      { id: 'underbust', label: 'Underbust Around' },
      { id: 'waist', label: 'Corset Waist' },
      { id: 'high_hip', label: 'High Hip' },
      { id: 'low_hip', label: 'Low Hip' },
      { id: 'gown_length', label: 'Full Floor Length' },
      { id: 'shoulder_to_waist', label: 'Shoulder to Waist' },
    ],
  },
  {
    name: 'Silk Chiffon Boubou',
    photoUrl: '/images/garments/boubou-female.jpg',
    gender: 'female',
    basePrice: 35000,
    measurementFields: [
      { id: 'length', label: 'Boubou Full Length' },
      { id: 'bust', label: 'Bust Around' },
      { id: 'sleeve', label: 'Shoulder to Wrist' },
      { id: 'neck_depth', label: 'V-Neck Drop' },
    ],
  },
  {
    name: 'Linen Safari Two-Piece',
    photoUrl: '/images/garments/two-piece-male.jpg',
    gender: undefined,
    basePrice: 40000,
    measurementFields: [
      { id: 'shirt_length', label: 'Shirt Length' },
      { id: 'chest', label: 'Chest Around' },
      { id: 'shoulder', label: 'Shoulder Width' },
      { id: 'sleeve', label: 'Short Sleeve' },
      { id: 'trouser_length', label: 'Trouser Length' },
      { id: 'waist', label: 'Waist' },
    ],
  },
];

