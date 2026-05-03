"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from '@googlemaps/js-api-loader';
import { searchMovies, getTMDBImageUrl, TMDBMovie } from '@/lib/tmdb';
import styles from './RichTextEditor.module.css';

interface PlaceSearchModalProps {
    initialData?: {
        placeName: string,
        address: string,
        rating: number,
        comment: string,
        placeId?: string,
        lat?: number,
        lng?: number,
        category?: string,
        type?: 'place' | 'movie' | 'manual',
        imageUrl?: string,
        tmdbRating?: string
    },
    onSelect: (data: { 
        placeName: string, 
        address: string, 
        rating: number, 
        comment: string, 
        placeId?: string,
        lat?: number,
        lng?: number,
        category?: string,
        type?: 'place' | 'movie' | 'manual',
        imageUrl?: string,
        tmdbRating?: string
    }) => void;
    onCancel: () => void;
}

const PlaceSearchModal: React.FC<PlaceSearchModalProps> = ({ onSelect, onCancel, initialData }) => {
    const [searchQuery, setSearchQuery] = useState(initialData?.placeName || '');
    const [results, setResults] = useState<any[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<any>(initialData ? {
        name: initialData.placeName,
        address: initialData.address,
        placeId: initialData.placeId,
        lat: initialData.lat,
        lng: initialData.lng
    } : null);
    const [isLoading, setIsLoading] = useState(false);
    const [rating, setRating] = useState(initialData?.rating || 4.0);
    const [comment, setComment] = useState(initialData?.comment || '');
    const [isManual, setIsManual] = useState(initialData?.placeId === 'manual');
    const [manualName, setManualName] = useState(initialData?.placeId === 'manual' ? initialData.placeName : '');
    const [manualAddress, setManualAddress] = useState(initialData?.placeId === 'manual' ? initialData.address : '');
    const [manualCategory, setManualCategory] = useState(initialData?.placeId === 'manual' ? (initialData as any).category || '' : '');
    
    // Movie Search State
    const [isMovie, setIsMovie] = useState(initialData?.type === 'movie');
    const [movieResults, setMovieResults] = useState<TMDBMovie[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(initialData?.type === 'movie' ? {
        id: parseInt(initialData.placeId?.replace('movie-', '') || '0'),
        title: initialData.placeName,
        poster_path: initialData.imageUrl?.replace('https://image.tmdb.org/t/p/w500', '') || null,
        release_date: '',
        original_title: '',
        overview: '',
        vote_average: parseFloat(initialData.tmdbRating || '0')
    } : null);
    
    // Services Refs
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);

    useEffect(() => {
        const loader = new Loader({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
            version: 'weekly',
            libraries: ['places']
        });

        loader.load().then(() => {
            autocompleteService.current = new google.maps.places.AutocompleteService();
            const dummyDiv = document.createElement('div');
            placesService.current = new google.maps.places.PlacesService(dummyDiv);
        }).catch((e: Error) => console.error("Google Maps load failed:", e));
    }, []);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setResults([]);
            setMovieResults([]);
            return;
        }

        setIsLoading(true);
        if (isMovie) {
            const movies = await searchMovies(query);
            setMovieResults(movies);
            setIsLoading(false);
        } else if (autocompleteService.current) {
            autocompleteService.current.getPlacePredictions(
                { input: query, language: 'ko' },
                (predictions) => {
                    setResults(predictions || []);
                    setIsLoading(false);
                }
            );
        }
    };

    const handleSelectResult = (prediction: google.maps.places.AutocompletePrediction) => {
        if (!placesService.current) return;

        setIsLoading(true);
        placesService.current.getDetails(
            { placeId: prediction.place_id, fields: ['name', 'geometry', 'formatted_address'] },
            (place, status) => {
                if (status === 'OK' && place?.geometry?.location) {
                    setSelectedPlace({
                        name: place.name,
                        address: place.formatted_address,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        placeId: prediction.place_id
                    });
                }
                setIsLoading(false);
            }
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSearch(searchQuery);
        }
    };

    const handleInsert = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isMovie && selectedMovie) {
            onSelect({
                placeName: selectedMovie.title,
                address: `${selectedMovie.release_date.split('-')[0]}년 개봉 · TMDB 평점 ${selectedMovie.vote_average.toFixed(1)}`,
                rating,
                comment: comment.trim() || `${selectedMovie.title} 리뷰입니다!`,
                placeId: `movie-${selectedMovie.id}`,
                type: 'movie',
                imageUrl: getTMDBImageUrl(selectedMovie.poster_path) || '',
                tmdbRating: selectedMovie.vote_average.toString()
            });
        } else if (isManual) {
            if (!manualName.trim()) {
                alert("제목을 입력해주세요.");
                return;
            }
            onSelect({
                placeName: manualName,
                address: manualAddress || '일반 장소',
                rating,
                comment: comment.trim() || `${manualName} 리뷰입니다!`,
                placeId: 'manual',
                category: manualCategory.trim(),
                type: 'manual'
            });
        } else if (selectedPlace) {
            onSelect({
                placeName: selectedPlace.name,
                address: selectedPlace.address,
                rating,
                comment: comment.trim() || `${selectedPlace.name} 추천합니다!`,
                placeId: selectedPlace.placeId,
                lat: selectedPlace.lat,
                lng: selectedPlace.lng,
                type: 'place'
            });
        }
    };

    const StarRating = () => {
        return (
            <div className={styles.starContainer} style={{ cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map((s) => {
                    const diff = rating - (s - 1);
                    const fillPercent = Math.max(0, Math.min(100, diff * 100));
                    return (
                        <div key={s} className={styles.starWrapper} onClick={() => setRating(s)}>
                            <svg viewBox="0 0 24 24" width="32" height="32" fill="#E2E8F0">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                <defs>
                                    <linearGradient id={`grad-${s}`}>
                                        <stop offset={`${fillPercent}%`} stopColor="#FF4804" />
                                        <stop offset={`${fillPercent}%`} stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                                <path 
                                    fill={`url(#grad-${s})`} 
                                    d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" 
                                />
                            </svg>
                        </div>
                    );
                })}
            </div>
        );
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            console.log("Ticgle Maps Debug - API Key Present:", !!key);
        }
    }, []);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const apiKeyMissing = !apiKey || apiKey === 'undefined' || apiKey === '';

    return (
        <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
        >
            <motion.div 
                className={styles.modalContent}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                style={{ maxWidth: '900px', width: '95%' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalHeader}>
                    <h3>📍 {initialData ? '리뷰 카드 수정하기' : '리뷰 카드 만들기'}</h3>
                    <div className={styles.toggleContainer}>
                        <button 
                            type="button"
                            className={`${styles.toggleBtn} ${(!isManual && !isMovie) ? styles.active : ''}`}
                            onClick={() => { setIsManual(false); setIsMovie(false); setResults([]); setMovieResults([]); setSelectedMovie(null); setSelectedPlace(null); setSearchQuery(''); }}
                        >
                            장소 검색
                        </button>
                        <button 
                            type="button"
                            className={`${styles.toggleBtn} ${isMovie ? styles.active : ''}`}
                            onClick={() => { setIsMovie(true); setIsManual(false); setResults([]); setMovieResults([]); setSelectedMovie(null); setSelectedPlace(null); setSearchQuery(''); }}
                        >
                            영화 검색
                        </button>
                        <button 
                            type="button"
                            className={`${styles.toggleBtn} ${isManual ? styles.active : ''}`}
                            onClick={() => { setIsManual(true); setIsMovie(false); setResults([]); setMovieResults([]); setSelectedMovie(null); setSelectedPlace(null); setSearchQuery(''); }}
                        >
                            직접 입력
                        </button>
                    </div>
                    <button type="button" onClick={onCancel} className={styles.closeBtn}>✕</button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.stepGrid}>
                        <div className={styles.stepSection}>
                            {isMovie ? (
                                <>
                                    <h4 className={styles.stepTitle}>1. 영화 정보 검색</h4>
                                    <div className={styles.searchBox}>
                                        <div className={styles.searchInputWrapper}>
                                            <input 
                                                type="text" 
                                                placeholder="영화 제목을 입력하세요" 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                            />
                                            <button 
                                                type="button" 
                                                className={styles.inlineSearchBtnCompact}
                                                onClick={() => handleSearch(searchQuery)}
                                            >
                                                검색
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.resultsContainer}>
                                        {isLoading && <div className={styles.listLoader}><div className={styles.miniLoader}></div></div>}
                                        {movieResults.length > 0 ? (
                                            movieResults.map((movie) => (
                                                <div 
                                                    key={movie.id} 
                                                    className={`${styles.resultRow} ${selectedMovie?.id === movie.id ? styles.active : ''}`}
                                                    onClick={() => setSelectedMovie(movie)}
                                                >
                                                    <div className={styles.resInfo} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        {movie.poster_path && (
                                                            <img 
                                                                src={getTMDBImageUrl(movie.poster_path)!} 
                                                                alt={movie.title} 
                                                                style={{ width: '40px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} 
                                                            />
                                                        )}
                                                        <div>
                                                            <div className={styles.resName}>{movie.title}</div>
                                                            <div className={styles.resAddr}>{movie.release_date} · {movie.original_title}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : !isLoading && searchQuery && (
                                            <div className={styles.emptyMsg}>검색 결과가 없습니다.</div>
                                        )}
                                    </div>
                                    <div className={styles.mapPreviewCompact}>
                                        {selectedMovie ? (
                                            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
                                                {selectedMovie.poster_path ? (
                                                    <img 
                                                        src={getTMDBImageUrl(selectedMovie.poster_path)!} 
                                                        alt={selectedMovie.title} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                                    />
                                                ) : (
                                                    <div className={styles.mapPlaceholder}>포스터 이미지가 없습니다</div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={styles.mapPlaceholder}>영화를 선택하면 포스터가 표시됩니다</div>
                                        )}
                                    </div>
                                </>
                            ) : isManual ? (
                                <>
                                    <h4 className={styles.stepTitle}>1. 리뷰 대상 정보 입력</h4>
                                    <div className={styles.manualInputs}>
                                        <div className={styles.inputGroup}>
                                            <label>제목 (영화, 책, 장소 등)</label>
                                            <input 
                                                type="text" 
                                                placeholder="리뷰할 대상의 이름을 적어주세요"
                                                value={manualName}
                                                onChange={(e) => setManualName(e.target.value)}
                                                className={styles.input}
                                                autoFocus
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>카테고리 (예: 사케, 영화, 소설 등)</label>
                                            <input 
                                                type="text" 
                                                placeholder="리뷰 성격을 나타내는 단어를 입력해주세요"
                                                value={manualCategory}
                                                onChange={(e) => setManualCategory(e.target.value)}
                                                className={styles.input}
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>설명 또는 주소 (선택)</label>
                                            <input 
                                                type="text" 
                                                placeholder="간략한 설명이나 위치 정보를 적어주세요"
                                                value={manualAddress}
                                                onChange={(e) => setManualAddress(e.target.value)}
                                                className={styles.input}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.manualGuideBox}>
                                        💡 수동 입력 시 지점 대신 게시물의 <strong>대표 이미지</strong>가 표시됩니다.
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h4 className={styles.stepTitle}>1. 글로벌 장소 검색</h4>
                                    {apiKeyMissing && (
                                        <div className={styles.apiKeyWarning}>
                                            ⚠️ API 키가 설정되지 않아 검색이 제한될 수 있습니다.
                                        </div>
                                    )}
                                    <div className={styles.searchBox}>
                                        <div className={styles.searchInputWrapper} onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="text" 
                                                placeholder="어디를 방문하셨나요?" 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button 
                                                type="button" 
                                                className={styles.inlineSearchBtnCompact}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSearch(searchQuery);
                                                }}
                                            >
                                                검색
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.resultsContainer}>
                                        {isLoading && <div className={styles.listLoader}><div className={styles.miniLoader}></div></div>}
                                        {results.length > 0 ? (
                                            results.map((item, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`${styles.resultRow} ${selectedPlace?.placeId === item.place_id ? styles.active : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectResult(item);
                                                    }}
                                                >
                                                    <div className={styles.resInfo}>
                                                        <div className={styles.resName}>{item.structured_formatting.main_text}</div>
                                                        <div className={styles.resAddr}>{item.structured_formatting.secondary_text}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : !isLoading && searchQuery && (
                                            <div className={styles.emptyMsg}>결과가 없습니다.</div>
                                        )}
                                    </div>

                                    <div className={styles.mapPreviewCompact}>
                                        {selectedPlace ? (
                                            <iframe 
                                                width="100%" 
                                                height="100%" 
                                                frameBorder="0" 
                                                style={{ border: 0 }}
                                                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=place_id:${selectedPlace.placeId}&language=ko`}
                                            />
                                        ) : (
                                            <div className={styles.mapPlaceholder}>장소를 선택하면 지도가 표시됩니다</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.stepSection}>
                            <h4 className={styles.stepTitle}>2. 평점 및 한줄평 입력</h4>
                            <div className={styles.formCard}>
                                <div className={styles.inputGroup}>
                                    <label>나의 평점 ({rating.toFixed(1)} / 5.0)</label>
                                    <div className={styles.ratingControlRow}>
                                        <StarRating />
                                        <div className={styles.ratingInputWrapper}>
                                            <input 
                                                type="number" min="0" max="5" step="0.1" 
                                                value={rating} 
                                                onChange={(e) => setRating(parseFloat(e.target.value) || 0)}
                                                className={styles.ratingNumInput}
                                            />
                                        </div>
                                    </div>
                                    <input 
                                        type="range" min="0" max="5" step="0.1" 
                                        value={rating} 
                                        onChange={(e) => setRating(parseFloat(e.target.value))}
                                        className={styles.ratingSlider}
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>기억에 남는 한줄평 (최대 50자)</label>
                                    <div className={styles.textAreaWrapper}>
                                        <textarea 
                                            placeholder="이 대상에 대한 느낌을 짧게 적어주세요" 
                                            maxLength={50} value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            rows={4} className={styles.commentTextArea}
                                        />
                                        <span className={`${styles.charCount} ${comment.length >= 50 ? styles.charLimit : ''}`}>
                                            {comment.length} / 50
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" onClick={onCancel} className={styles.cancelBtn}>취소</button>
                    <button 
                        type="button"
                        onClick={handleInsert} 
                        className={styles.confirmBtn} 
                        disabled={isMovie ? !selectedMovie : isManual ? !manualName.trim() : !selectedPlace}
                    >
                        {initialData ? '수정 완료' : '리뷰 카드 완성'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PlaceSearchModal;
