"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CourseDetail {
  golfCourseId: number;
  golfCourseName: string;
  golfCourseAbbr: string;
  address: string;
  golfCourseDetailUrl: string;
  reserveCalUrl: string;
  layoutImageUrl: string;
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
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-amber-500 text-sm">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>
        <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
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
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 px-4">
        <p className="text-destructive">{error ?? "コースが見つかりませんでした"}</p>
        <Link href="/courses">
          <Button variant="outline">戻る</Button>
        </Link>
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
    <div className="space-y-4 pb-8">
      {/* Image carousel */}
      {images.length > 0 && (
        <div className="relative">
          <div className="relative h-56 w-full bg-muted overflow-hidden">
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
                  className={`h-2 w-2 rounded-full transition-colors ${i === imageIndex ? "bg-primary" : "bg-muted-foreground/30"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Course name & back */}
        <div className="flex items-start gap-2">
          <Link href="/courses">
            <Button variant="ghost" size="sm" className="px-1 text-muted-foreground">
              ← 戻る
            </Button>
          </Link>
        </div>
        <h1 className="text-xl font-bold leading-tight">{course.golfCourseName}</h1>
        {course.address && (
          <p className="text-sm text-muted-foreground">{course.address}</p>
        )}

        {/* Reserve button */}
        {course.reserveCalUrl && (
          <a href={course.reserveCalUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full h-11">予約する</Button>
          </a>
        )}

        {/* Introduction */}
        {course.introduction && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">{course.introduction}</p>
            </CardContent>
          </Card>
        )}

        {/* Price card */}
        {(course.weekdayMinPrice > 0 || course.holidayMinPrice > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">料金</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {course.weekdayMinPrice > 0 && (
                <InfoRow label="平日最安値" value={`¥${course.weekdayMinPrice.toLocaleString()}〜`} />
              )}
              {course.holidayMinPrice > 0 && (
                <InfoRow label="休日最安値" value={`¥${course.holidayMinPrice.toLocaleString()}〜`} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Course info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">コース情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="コースタイプ" value={course.courseType} />
            <InfoRow label="設計者" value={course.designer} />
            <InfoRow label="ホール数" value={course.holes > 0 ? `${course.holes}H` : null} />
            <InfoRow label="パー" value={course.par > 0 ? `Par ${course.par}` : null} />
            <InfoRow label="距離" value={course.courseDistance} />
            <InfoRow label="高低差" value={course.courseVerticalInterval} />
          </CardContent>
        </Card>

        {/* Ratings */}
        {course.evaluation > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">評価</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 pb-1">
                <span className="text-2xl font-bold">{course.evaluation.toFixed(1)}</span>
                <span className="text-amber-500 text-lg">★</span>
                <span className="text-sm text-muted-foreground">({course.reviewCount.toLocaleString()}件)</span>
              </div>
              <Separator />
              {course.evaluationStaff > 0 && <StarDisplay rating={course.evaluationStaff} label="スタッフ" />}
              {course.evaluationFacility > 0 && <StarDisplay rating={course.evaluationFacility} label="施設" />}
              {course.evaluationMeal > 0 && <StarDisplay rating={course.evaluationMeal} label="食事" />}
              {course.evaluationCourse > 0 && <StarDisplay rating={course.evaluationCourse} label="コース" />}
              {course.evaluationCostperformance > 0 && <StarDisplay rating={course.evaluationCostperformance} label="コスパ" />}
              {course.evaluationDistance > 0 && <StarDisplay rating={course.evaluationDistance} label="距離" />}
              {course.evaluationFairway > 0 && <StarDisplay rating={course.evaluationFairway} label="フェアウェイ" />}
            </CardContent>
          </Card>
        )}

        {/* Facilities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">設備・ルール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="練習場" value={course.praticeFacility} />
            <InfoRow label="宿泊" value={course.lodging} />
            <InfoRow label="ドレスコード" value={course.dressCode} />
            <InfoRow label="シューズ" value={course.shoes} />
            <InfoRow label="クレジットカード" value={course.creditCard} />
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">アクセス</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="住所" value={course.address} />
            <InfoRow label="高速道路" value={course.highwayName} />
            <InfoRow label="最寄りIC" value={course.icName} />
            {course.icDistance && (
              <InfoRow
                label="ICからの距離"
                value={`${course.icDistance}${course.icDistanceUnit ?? ""}`}
              />
            )}
          </CardContent>
        </Card>

        {/* Layout image */}
        {course.layoutImageUrl && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">コースレイアウト</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <a href={course.layoutImageUrl} target="_blank" rel="noopener noreferrer">
                <div className="relative h-48 w-full bg-muted rounded overflow-hidden">
                  <Image
                    src={course.layoutImageUrl}
                    alt="コースレイアウト"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Reserve button at bottom */}
        {course.reserveCalUrl && (
          <a href={course.reserveCalUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full h-11">予約する（楽天GORA）</Button>
          </a>
        )}
      </div>
    </div>
  );
}
