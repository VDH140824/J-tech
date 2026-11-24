import { useQuery } from "@tanstack/react-query";
import { getVocabularies } from "../../api/vocabularyApi";

export function StudentVocabularyList({ lessonId }: { lessonId: number }) {
  const vocabulary = useQuery({
    queryKey: ["published-vocabularies", lessonId],
    queryFn: ({ signal }) =>
      getVocabularies(`/lessons/${lessonId}/vocabularies?status=PUBLISHED`, signal),
  });

  return (
    <section className="mod-vocab-published-words" aria-label="Từ vựng đã xuất bản">
      <div className="mod-vocab-published-words__heading">
        <div>
          <h3>Từ vựng đã xuất bản</h3>
          <p>Mỗi hàng là một từ, kèm cách đọc, nghĩa và ví dụ.</p>
        </div>
        {!vocabulary.isLoading && !vocabulary.isError && (
          <span>{vocabulary.data?.length ?? 0} từ</span>
        )}
      </div>
      {vocabulary.isLoading ? (
        <p className="mod-vocab-published-words__message" role="status">Đang tải từ vựng...</p>
      ) : vocabulary.isError ? (
        <div className="mod-vocab-published-words__message" role="alert">
          <p>Không thể tải từ vựng. Vui lòng thử lại.</p>
          <button type="button" className="mod-btn-back" onClick={() => vocabulary.refetch()}>
            Thử lại
          </button>
        </div>
      ) : !vocabulary.data?.length ? (
        <p className="mod-vocab-published-words__message">
          Chưa có từ vựng được xuất bản trong bài học này.
        </p>
      ) : (
        <div
          className="mod-vocab-published-words__scroll"
          tabIndex={0}
          aria-label="Danh sách từ vựng, có thể cuộn"
        >
          <table className="mod-vocab-published-words__table">
            <thead>
              <tr>
                <th scope="col">STT</th>
                <th scope="col">Thuật ngữ</th>
                <th scope="col">Cách đọc</th>
                <th scope="col">Nghĩa</th>
                <th scope="col">Từ loại</th>
                <th scope="col">Ví dụ</th>
              </tr>
            </thead>
            <tbody>
              {vocabulary.data.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td className="mod-vocab-published-words__word" lang="ja">
                    {item.word}
                  </td>
                  <td lang="ja">{item.reading}</td>
                  <td>{item.meaningVi}</td>
                  <td>{item.wordType || "—"}</td>
                  <td>
                    {item.exampleJp && (
                      <span className="mod-vocab-published-words__example" lang="ja">
                        {item.exampleJp}
                      </span>
                    )}
                    {item.exampleVi && (
                      <span className="mod-vocab-published-words__example-translation">
                        {item.exampleVi}
                      </span>
                    )}
                    {!item.exampleJp && !item.exampleVi && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
