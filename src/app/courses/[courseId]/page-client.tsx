"use client";
import { Loading } from "@/components/loading";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { Heart, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteCourses, addFavoriteCourse, removeFavoriteCourse } from "@/hooks/use-profile";

interface CourseDetail {
  golfCourseId: number;
  golfCourseName: string;
  golfCourseAbbr: string;
  address: string;
  golfCourseDetailUrl: string;
  reserveCalUrl: string;
  layoutUrl: string;
  routeMapUrl: string;
  golfCourseImageUrl1: string;
  golfCourseImageUrl2: string;
  golfCourseImageUrl3: string;
  golfCourseImageUrl4: string;
  golfCourseImageUrl5: string;
  evaluation: number;
  evaluationStaff: number;
  evaluationFacility: number;
  evaluationMeal: number;
  evaluationCourse: number;
  evaluationCostperformance: number;
  evaluationDistance: number;
  evaluationFairway: number;
  reviewCount: number;
  weekdayMinPrice: number;
  holidayMinPrice: number;
  courseType: string;
  courseVerticalInterval: string;
  designer: string;
  holes: number;
  par: number;
  courseDistance: string;
  praticeFacility: string;
  lodging: string;
  dressCode: string;
  shoes: string;
  creditCard: string;
  prefecture: string;
  highwayName: string;
  icName: string;
  icDistance: string;
  icDistanceUnit: string;
  introduction: string;
}

interface ApiResponse {
  Item: CourseDetail;
}

function StarDisplay({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-base">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-amber-500 text-base">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
        <span className="text-base text-[#8b8b8b]">{rating.toFixed(1)}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center border-b border-[#c4c4c4] py-2 last:border-b-0">
      <span className="text-base">{label}</span>
      <span className="text-base text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function LinkButtons({ layoutUrl, routeMapUrl }: { layoutUrl?: string; routeMapUrl?: string }) {
  if (!layoutUrl && !routeMapUrl) return null;
  return (
    <div className="flex gap-2">
      {layoutUrl && (
        <a href={layoutUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <button className="w-full rounded-full border border-white py-2 text-base font-bold text-white">
            コースレイアウト
          </button>
        </a>
      )}
      {routeMapUrl && (
        <a href={routeMapUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <button className="w-full rounded-full border border-white py-2 text-base font-bold text-white">
            アクセスマップ
          </button>
        </a>
      )}
    </div>
  );
}

function ReserveButton({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <button className="w-full rounded-full bg-white py-2 text-base font-bold text-[#006728]">
        予約する
      </button>
    </a>
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const { user } = useAuth();
  const { courses: favCourses, refetch: refetchFav } = useFavoriteCourses();
  const [favLoading, setFavLoading] = useState(false);
  const isFavorited = favCourses.some((c) => c.gora_course_id === Number(courseId));

  async function toggleFavorite() {
    if (!course) return;
    setFavLoading(true);
    try {
      if (isFavorited) {
        const fav = favCourses.find((c) => c.gora_course_id === Number(courseId));
        if (fav) await removeFavoriteCourse(fav.id);
      } else {
        await addFavoriteCourse({
          gora_course_id: course.golfCourseId,
          course_name: course.golfCourseName,
          course_image_url: course.golfCourseImageUrl1,
          evaluation: course.evaluation,
          address: course.address,
          is_manual: false,
        });
      }
      refetchFav();
    } catch (e) {
      console.error(e);
    } finally {
      setFavLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/courses/${courseId}`);
        if (!res.ok) throw new Error("コース情報の取得に失敗しました");
        const data: ApiResponse = await res.json();
        setCourse(data.Item);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [courseId]);

  if (isLoading) {
    return <Loading variant="light" />;
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 px-4">
        <p className="text-base text-red-500">{error ?? "コースが見つかりませんでした"}</p>
      </div>
    );
  }

  const images = [
    course.golfCourseImageUrl1,
    course.golfCourseImageUrl2,
    course.golfCourseImageUrl3,
    course.golfCourseImageUrl4,
    course.golfCourseImageUrl5,
  ].filter(Boolean);

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 pb-8 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader
        title={course.golfCourseName}
        subtitle={course.address}
        backHref="/courses"
        variant="dark"
      />

      {/* Image carousel */}
      {images.length > 0 && (
        <div>
          <div className="relative h-56 w-full rounded-lg bg-[#f5f5f5] overflow-hidden">
            <Image
              src={images[imageIndex]}
              alt={course.golfCourseName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${i === imageIndex ? "bg-[#006728]" : "bg-[#c5c5c5]"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link buttons + Reserve + Favorite */}
      <LinkButtons layoutUrl={course.layoutUrl} routeMapUrl={course.routeMapUrl} />
      <ReserveButton url={course.reserveCalUrl} />
      {user && (
        <button
          onClick={toggleFavorite}
          disabled={favLoading}
          className={`flex items-center justify-center gap-2 w-full rounded-full py-2 text-base font-bold ${
            isFavorited
              ? "border border-white text-white"
              : "bg-white/20 text-white"
          }`}
        >
          {favLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${isFavorited ? "fill-white" : ""}`} />
          )}
          {isFavorited ? "お気に入り登録済み" : "お気に入りに追加"}
        </button>
      )}

      {/* Introduction */}
      {course.introduction && (
        <div className="rounded-lg bg-white p-3">
          <p className="text-base leading-relaxed whitespace-pre-line">{course.introduction}</p>
        </div>
      )}

      {/* Price */}
      {(course.weekdayMinPrice > 0 || course.holidayMinPrice > 0) && (
        <>
          <p className="text-base font-bold text-white px-1 pt-4">料金</p>
          <div className="rounded-lg bg-white p-3">
            {course.weekdayMinPrice != null && course.weekdayMinPrice > 0 && (
              <InfoRow label="平日最安値" value={`¥${course.weekdayMinPrice.toLocaleString()}〜`} />
            )}
            {course.holidayMinPrice != null && course.holidayMinPrice > 0 && (
              <InfoRow label="休日最安値" value={`¥${course.holidayMinPrice.toLocaleString()}〜`} />
            )}
          </div>
        </>
      )}

      {/* Course info */}
      <p className="text-base font-bold text-white px-1 pt-4">コース情報</p>
      <div className="rounded-lg bg-white p-3">
        <InfoRow label="コースタイプ" value={course.courseType} />
        <InfoRow label="設計者" value={course.designer} />
        <InfoRow label="ホール数" value={course.holes > 0 ? `${course.holes}H` : null} />
        <InfoRow label="パー" value={course.par > 0 ? `Par ${course.par}` : null} />
        <InfoRow label="距離" value={course.courseDistance} />
        <InfoRow label="高低差" value={course.courseVerticalInterval} />
      </div>

      {/* Ratings */}
      {course.evaluation > 0 && (
        <>
          <p className="text-base font-bold text-white px-1 pt-4">評価</p>
          <div className="rounded-lg bg-white p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl font-bold">{course.evaluation?.toFixed(1) ?? "—"}</span>
              <span className="text-amber-500 text-lg">★</span>
              {course.reviewCount != null && <span className="text-base text-[#8b8b8b]">({course.reviewCount.toLocaleString()}件)</span>}
            </div>
            <div className="border-t border-[#c4c4c4] pt-2">
              {course.evaluationStaff != null && course.evaluationStaff > 0 && <StarDisplay rating={course.evaluationStaff} label="スタッフ" />}
              {course.evaluationFacility != null && course.evaluationFacility > 0 && <StarDisplay rating={course.evaluationFacility} label="施設" />}
              {course.evaluationMeal != null && course.evaluationMeal > 0 && <StarDisplay rating={course.evaluationMeal} label="食事" />}
              {course.evaluationCourse != null && course.evaluationCourse > 0 && <StarDisplay rating={course.evaluationCourse} label="コース" />}
              {course.evaluationCostperformance != null && course.evaluationCostperformance > 0 && <StarDisplay rating={course.evaluationCostperformance} label="コスパ" />}
              {course.evaluationDistance != null && course.evaluationDistance > 0 && <StarDisplay rating={course.evaluationDistance} label="距離" />}
              {course.evaluationFairway != null && course.evaluationFairway > 0 && <StarDisplay rating={course.evaluationFairway} label="フェアウェイ" />}
            </div>
          </div>
        </>
      )}

      {/* Facilities */}
      <p className="text-base font-bold text-white px-1 pt-4">設備・ルール</p>
      <div className="rounded-lg bg-white p-3">
        <InfoRow label="練習場" value={course.praticeFacility} />
        <InfoRow label="宿泊" value={course.lodging} />
        <InfoRow label="ドレスコード" value={course.dressCode} />
        <InfoRow label="シューズ" value={course.shoes} />
        <InfoRow label="クレジットカード" value={course.creditCard} />
      </div>

      {/* Location */}
      <p className="text-base font-bold text-white px-1 pt-4">アクセス</p>
      <div className="rounded-lg bg-white p-3">
        <InfoRow label="住所" value={course.address} />
        <InfoRow label="高速道路" value={course.highwayName} />
        <InfoRow label="最寄りIC" value={course.icName} />
        {course.icDistance && (
          <InfoRow label="ICからの距離" value={`${course.icDistance}${course.icDistanceUnit ?? ""}`} />
        )}
      </div>

      {/* Bottom link buttons + Reserve */}
      <LinkButtons layoutUrl={course.layoutUrl} routeMapUrl={course.routeMapUrl} />
      <ReserveButton url={course.reserveCalUrl} />
      </div>
    </div>
  );
}
