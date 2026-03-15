export interface Scrobble {
	readonly track: string;
	readonly artist: string;
	readonly album: string;
	readonly timestamp: number;
	readonly albumMbid?: string;
}

export interface AlbumTrack {
	readonly name: string;
	readonly position: number;
}

export interface AlbumInfo {
	readonly name: string;
	readonly artist: string;
	readonly trackCount: number;
	readonly tracks: readonly AlbumTrack[];
}

export interface AlbumRunCandidate {
	readonly albumName: string;
	readonly artistName: string;
	readonly tracks: readonly Scrobble[];
	readonly positions: readonly number[];
	readonly albumTrackCount: number;
	readonly startPosition: number;
	readonly startedFromTrack1: boolean;
	readonly isShortAlbum: boolean;
}

export interface AlgorithmResult {
	readonly albumQuotient: number;
	readonly totalAlbumsAsUnit: number;
	readonly topAlbum: { readonly name: string; readonly artist: string } | null;
	readonly albumRuns: readonly import('$lib/types').AlbumRun[];
	readonly totalScrobbles: number;
}

export interface EnrichedScrobble {
	readonly track: string;
	readonly artist: string;
	readonly album: string;
	readonly timestamp: number;
	readonly trackPosition: number | null;
	readonly albumTotalTracks: number | null;
	readonly isCompilation: boolean;
	readonly albumMbid?: string;
}

export type MetricDirection = 'above' | 'below' | 'near';

export interface MetricCondition {
	readonly metric: string;
	readonly direction: MetricDirection;
	readonly target: number;
	readonly rampStart: number;
	readonly weight: number;
}

export interface ArchetypeDefinition {
	readonly name: import('$lib/types').ArchetypeName;
	readonly description: string;
	readonly conditions: readonly MetricCondition[];
	readonly requiredData: readonly ('popularity' | 'genre')[];
}
