import { useQuery } from "@tanstack/react-query";
import { getVocabularies } from "../../api/vocabularyApi";

export function StudentVocabularyList({ lessonId }: { lessonId: number }) {
  const vocabulary = useQuery({
    queryKey: ["student-vocabularies", lessonId],
    queryFn: ({ signal }) => getVocabularies(`/lessons/${lessonId}/vocabularies`, signal),
  });

  return <section aria-label="Từ vựng bài học">
    <h3>Từ vựng</h3>
    {vocabulary.isLoading ? <p role="status">Đang tải từ vựng...</p>
      : vocabulary.isError ? <div role="alert">
        <p>Không thể tải từ vựng. Vui lòng thử lại.</p>
        <button type="button" onClick={() => vocabulary.refetch()}>Thử lại</button>
      </div>
        : !vocabulary.data?.length ? <p>Chưa có từ vựng được xuất bản trong bài học này.</p>
          : <div className="course-detail-chapters">
            {vocabulary.data.map(item => <article className="course-detail-chapter" key={item.id}>
              <div>
                <h3 lang="ja">{item.word}</h3>
                <p lang="ja">{item.reading}</p>
                <p>{item.meaningVi}</p>
                {item.wordType && <p>Từ loại: {item.wordType}</p>}
                {item.exampleJp && <p lang="ja">{item.exampleJp}</p>}
                {item.exampleVi && <p>{item.exampleVi}</p>}
                {item.audioUrl && <audio controls preload="none" style={{ maxWidth: "100%" }} aria-label={`Phát âm ${item.word}`} src={String(item.audioUrl)} />}
              </div>
            </article>)}
          </div>}
  </section>;
}
