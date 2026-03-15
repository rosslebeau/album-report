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

export interface AnalysisResult {
	readonly username: string;
	readonly albumQuotient: number;
	readonly totalAlbumsAsUnit: number;
	readonly topAlbum: TopAlbum | null;
	readonly totalScrobbles: number;
	readonly albumRuns: readonly AlbumRun[];
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
