export interface TopAlbum {
	readonly name: string;
	readonly artist: string;
}

export interface AlbumRun {
	readonly albumName: string;
	readonly artistName: string;
	readonly trackCount: number;
	readonly albumTrackCount: number;
	readonly startedFromTrack1: boolean;
	readonly startPosition: number;
	readonly isShortAlbum: boolean;
	readonly weight: number;
}

export type ArchetypeName =
	| 'Ritualist'
	| 'Deep Diver'
	| 'Completionist'
	| 'Side A Loyalist'
	| 'Singles Hound'
	| 'Cherry Picker'
	| 'Curator'
	| 'Shuffle Gremlin';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ListeningMetrics {
	readonly albumCompletionRate: number;
	readonly artistConcentration: number;
	readonly albumBreadth: number;
	readonly trackPositionSkew: number;
	readonly repeatIntensityAlbum: number;
	readonly repeatIntensityTrack: number;
	readonly scrobbleEntropy: number;
	readonly popularitySkew: number | null;
	readonly genreCoherence: number | null;
	readonly uniqueAlbums: number;
	readonly uniqueArtists: number;
	readonly totalScrobbles: number;
	readonly qualifyingAlbums: number;
}

export interface InterestingStat {
	readonly label: string;
	readonly value: string;
	readonly detail: string | null;
}

export interface ArchetypeResult {
	readonly archetype: ArchetypeName;
	readonly confidence: number;
	readonly confidenceLevel: ConfidenceLevel;
	readonly description: string;
	readonly secondaryArchetype: ArchetypeName | null;
	readonly secondaryDescription: string | null;
	readonly metrics: ListeningMetrics;
	readonly interestingStats: readonly InterestingStat[];
	readonly archetypeScores: Partial<Record<ArchetypeName, number>>;
	readonly disabledArchetypes: readonly ArchetypeName[];
}

export interface AnalysisResult {
	readonly username: string;
	readonly albumQuotient: number;
	readonly totalAlbumsAsUnit: number;
	readonly topAlbum: TopAlbum | null;
	readonly totalScrobbles: number;
	readonly albumRuns: readonly AlbumRun[];
	readonly archetypeResult: ArchetypeResult | null;
}

export interface PersistedAnalysisResult extends AnalysisResult {
	readonly id: string;
	readonly shareId: string;
	readonly createdAt: string;
}

export interface ApiError {
	readonly error: string;
	readonly message: string;
}
