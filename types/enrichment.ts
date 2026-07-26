export interface GameMetadata {
  igdbId: number;
  description: string | null;
  genres: string[];
  coverUrl: string | null;
  screenshotUrls: string[];
  /** YouTube watch URLs from IGDB videos (trailer-first). */
  videoUrls: string[];
  rating: number | null;
  releaseDate: string | null;
}
