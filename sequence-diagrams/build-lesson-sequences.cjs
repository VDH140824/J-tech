const fs = require('fs');
const path = require('path');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pages=[];
function legacyDiagram(name, actors, rows) {
 let id=2, cells=[], y=170, n=0;
 const xs=actors.map((_,i)=>100+i*265), h=220+rows.reduce((sum,r)=>sum+(typeof r==='string' && r.startsWith('break ')?4:1),0)*68;
 const cell=(value,style,x,y,w,hh,edge=false,points='')=>{const k=id++;cells.push(`<mxCell id="${k}" value="${esc(value)}" style="${style}" ${edge?'edge':'vertex'}="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${hh}" as="geometry" ${edge?'relative="1"':''}>${points}</mxGeometry></mxCell>`);return k;};
 const width=xs.at(-1)+145;
 const activate=(index,top,height=34,offset=0)=>{
   if(index===0)return;
   cell('', 'rounded=0;html=0;fillColor=#ffffff;strokeColor=#333333;',xs[index]-6+offset,top,12,height);
 };
 cell(name,'text;html=0;align=left;fontSize=23;fontStyle=1;',25,10,width,40);
 cell('Scope: bài học Từ vựng (lesson.skillType = VOCABULARY). Moderator đã đăng nhập. Browser là nơi chạy React.','text;html=0;align=left;fontSize=13;',25,52,width,30);
 actors.forEach((a,i)=>{
   cell(a,i===0?'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=0;':'rounded=0;whiteSpace=wrap;html=0;fillColor=#ffffff;fontSize=13;',i===0?xs[i]-15:xs[i]-105,95,i===0?30:210,i===0?45:52);
   cell('','endArrow=none;dashed=1;strokeColor=#999999;',0,0,0,0,true,`<mxPoint x="${xs[i]}" y="155" as="sourcePoint"/><mxPoint x="${xs[i]}" y="${h}" as="targetPoint"/>`);
 });
 rows.forEach(r=>{
   if(typeof r==='string') {
     if(r.startsWith('break ')) {
       const boundary=r.indexOf(']:');
       const guard=r.slice(0,boundary+1), detail=r.slice(boundary+2).trim();
       cell(guard,'shape=umlFrame;whiteSpace=wrap;html=0;align=left;verticalAlign=top;spacingLeft=8;spacingTop=4;fillColor=none;strokeColor=#666666;fontSize=13;',25,y-15,width-10,235);
       cell(detail,'text;whiteSpace=wrap;html=0;align=left;fontSize=13;labelBackgroundColor=#ffffff;',45,y+30,width-70,40);
       const ctrl=actors.findIndex(a=>a.includes('«controller»'));
       const api=actors.findIndex(a=>a.includes('«module»'));
       const receiver=actors.findIndex(a=>a.includes('LessonFormModal'))>=0?actors.findIndex(a=>a.includes('LessonFormModal')):actors.findIndex(a=>a.includes('ModeratorVocabularyLessonPage'))>=0?actors.findIndex(a=>a.includes('ModeratorVocabularyLessonPage')):actors.findIndex(a=>a.includes('ModeratorLessonListTab'));
       const frontend=r.includes('frontend')||r.includes('invalid input')||r.includes('invalid lessonId')||r.includes('chapter/skill');
       const calls=frontend?[[receiver,receiver,'Set validation error; stop this attempt'],[receiver,1,'Keep current form / show error']]:[[ctrl,api,/409/.test(r)?'409 Conflict + error':/404/.test(r)?'404 Not Found':'Error response'],[api,receiver,'Reject promise → catch; display error; clear busy/loading']];
       calls.forEach(([a,b,t],j)=>{const yy=y+110+j*62; const x1=xs[a],x2=xs[b];activate(a,yy-8,38);activate(b,yy,34,a===b?6:0);let pts=`<mxPoint x="${x1}" y="${yy}" as="sourcePoint"/><mxPoint x="${x2}" y="${yy}" as="targetPoint"/>`;if(a===b)pts=`<mxPoint x="${x1}" y="${yy}" as="sourcePoint"/><mxPoint x="${x1}" y="${yy+22}" as="targetPoint"/><Array as="points"><mxPoint x="${x1+90}" y="${yy}"/><mxPoint x="${x1+90}" y="${yy+22}"/></Array>`;cell(`${++n}. ${t}`,'html=0;endArrow=open;endFill=0;dashed=1;fontSize=12;labelBackgroundColor=#ffffff;verticalAlign=bottom;',0,0,0,0,true,pts);});
       y+=272;return;
     }
     cell(r,'shape=note;whiteSpace=wrap;html=0;align=left;spacing=8;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=13;',25,y-8,width-10,48);y+=68;return;
   }
   const [a,b,label,ret]=r; n++;
   activate(a,y-8,44);
   activate(b,y,a===b?40:34,a===b?6:0);
   const x1=xs[a],x2=xs[b];
   let pts=`<mxPoint x="${x1}" y="${y}" as="sourcePoint"/><mxPoint x="${x2}" y="${y}" as="targetPoint"/>`;
   if(a===b) pts=`<mxPoint x="${x1}" y="${y}" as="sourcePoint"/><mxPoint x="${x1}" y="${y+26}" as="targetPoint"/><Array as="points"><mxPoint x="${x1+110}" y="${y}"/><mxPoint x="${x1+110}" y="${y+26}"/></Array>`;
   cell(`${n}. ${label}`,`html=0;endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}fontSize=12;labelBackgroundColor=#ffffff;verticalAlign=bottom;rounded=0;`,0,0,0,0,true,pts);
   y+=68;
 });
 pages.push(`<diagram id="page-${pages.length+1}" name="${esc(name)}"><mxGraphModel dx="1800" dy="1000" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="${width+70}" pageHeight="${h+80}" background="#ffffff"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram>`);
}
const diagram = require('./sequence-renderer.cjs')(pages);
const base=['Moderator','«browser»\nBrowser / React runtime','«boundary»\nModeratorLessonListTab','«boundary»\nLessonFormModal','«module»\nlessonApi.ts','«controller»\nLessonController','«repository»\nChapterRepository','«repository»\nLessonRepository'];
diagram('01 - Create vocabulary lesson',base,[
 [0,1,'Click “Thêm bài học”'],[1,2,'onClick → handleOpenCreateModal()'],[2,2,'readOnly guard; setEditingLesson(null); setIsModalOpen(true)'],[2,3,'Render: isOpen=true; onSubmit=handleSubmitForm'],[3,3,'useEffect: empty fields; lessonNo/displayOrder=nextLessonNo; status=PUBLISHED'],[3,1,'Display creation form',true],[0,1,'Enter data; click “Tạo bài học”'],[1,3,'form onSubmit → handleSubmit(event)'],[3,3,'preventDefault; require trimmed title and lessonNo >= 1; validate document URLs'],
 'break [invalid frontend input]: setErrorMsg; keep form open; no API request.',
 [3,3,'Build cleanPayload; setSubmitting(true); clear error'],[3,2,'await onSubmit(cleanPayload) → handleSubmitForm'],[2,2,'Add skillType=VOCABULARY; editingLesson is null'],[2,4,'await createLesson(chapterId, payload, courseId)'],[4,5,'POST /chapters/{chapterId}/lessons + payload'],
 'Guard: Spring security requires ADMIN/MODERATOR; @Valid LessonRequest → 400 on invalid input. Error propagates to modal catch.',
 [5,6,'findById(chapterId)'],[6,5,'Chapter / empty',true],
 'break [chapter missing]: return 404; frontend keeps form open and displays error.',
 [5,7,'existsByChapterIdAndSkillTypeAndDisplayOrder(...)'],[7,5,'boolean',true],
 'break [displayOrder already used in chapter + skill]: return 409; keep form open and show error.',
 [5,5,'Normalize empty documents; build Lesson(chapter, VOCABULARY, request fields)'],[5,7,'save(lesson)'],[7,5,'Saved Lesson',true],[5,4,'201 Created + LessonResponse',true],[4,2,'Resolve createLesson()',true],[2,2,'showNotification(success); await fetchLessons()'],[2,4,'getLessonsByChapter(chapterId, VOCABULARY, statusFilter, courseId)'],[4,5,'GET /chapters/{chapterId}/lessons?skillType=VOCABULARY [&status]'],[5,7,'Query lessons using current skill/status filter'],[7,5,'Lessons',true],[5,4,'200 + LessonResponse[]',true],[4,2,'setLessons(data); finally setLoading(false)',true],[2,3,'Resolve onSubmit()',true],[3,2,'onClose() → setIsModalOpen(false)'],[3,3,'finally setSubmitting(false)'],[2,1,'Render refreshed table + success notice',true],
 'Failure path: rejected submit → LessonFormModal.catch sets errorMsg; no onClose; finally clears submitting. fetchLessons catches its own load error.'
]);
diagram('02 - View vocabulary lesson list',['Moderator','«browser»\nBrowser / React runtime','«boundary»\nModeratorChapterDetailPage','«boundary»\nModeratorLessonListTab','«module»\nlessonApi.ts','«controller»\nLessonController','«repository»\nLessonRepository'],[
 [0,1,'Click “Từ vựng” / “Vào bài học” in skill overview'],[1,2,'onSelectSkill → handleSelectSection("vocabulary")'],[2,3,'Render selectedSection=vocabulary, chapterId; readOnly=false'],[3,3,'useEffect → fetchLessons(); loading=true; error=null'],[3,4,'getLessonsByChapter(chapterId, VOCABULARY, statusFilter, courseId)'],[4,5,'GET /chapters/{chapterId}/lessons?skillType=VOCABULARY [&status]'],[5,6,'findByChapterIdAndSkillType[AndStatus]OrderByDisplayOrderAscLessonNoAscIdAsc'],[6,5,'List<Lesson>',true],[5,5,'mapToResponse for each lesson'],[5,4,'200 OK + LessonResponse[]',true],[4,3,'Return data',true],[3,3,'setLessons(data); finally loading=false; filter search locally'],[3,1,'Render lesson table / empty state',true],
 'Error path: request rejects → setError("Không thể tải danh sách bài học từ máy chủ."); finally loading=false.',
 [0,1,'Change status filter'],[1,3,'setStatusFilter → useEffect → fetchLessons() again'],
 'ref: repeat GET with selected status; ALL omits status. Search matches title, description or lessonNo locally without a new API call.',
 'Actual endpoint does not call ChapterRepository/checkLesson and does not perform a chapter-existence check in this controller method.'
]);
diagram('03 - View vocabulary lesson detail',['Moderator','«browser»\nBrowser / React runtime','«boundary»\nModeratorLessonListTab','«boundary»\nModeratorChapterDetailPage','«boundary»\nModeratorVocabularyLessonPage','«module»\nlessonApi.ts','«controller»\nLessonController','«repository»\nLessonRepository'],[
 [0,1,'Click “Mở bài học” on a lesson row'],[1,2,'onClick'],[2,3,'onViewLessonItems(lesson) → handleViewLessonItems(lesson)'],[3,3,'Set active lesson; save moderator-active-lesson in sessionStorage'],[3,1,'setSearchParams: lessonId=lesson.id; remove vocabTab; replace=true'],[3,4,'Render with lessonId, chapterId and context'],[4,4,'useEffect: loading=true; clear error; validate positive safe lessonId'],
 'break [invalid lessonId]: show invalid URL error; loading=false; no API request.',
 [4,5,'getLessonById(lessonId)'],[5,6,'GET /lessons/{id}'],[6,7,'findById(id)'],[7,6,'Lesson / empty',true],
 'break [missing lesson]: 404; page catch shows load error and retry option.',
 [6,5,'200 + mapToResponse(lesson)',true],[5,4,'LessonSummary',true],[4,4,'Check data.chapterId === chapterId and skillType === VOCABULARY'],
 'break [chapter/skill mismatch]: show “Bài học không thuộc phần từ vựng của chương này.”',
 [4,4,'setLesson(data); finally loading=false'],[4,1,'Display lesson; default document tab (vocabTab was removed)',true],
 'Optional tabs: words renders ModeratorVocabularyListPage and loads the words of this lesson; exercise opens mini-tests. These are separate subflows.',
 [0,1,'Click back to lesson list'],[1,3,'onBack → handleViewLessonItems(null)'],[3,1,'Clear active state/sessionStorage; remove lessonId and vocabTab'],[3,2,'Render ModeratorLessonListTab again']
]);
diagram('04 - Update vocabulary lesson',base,[
 [0,1,'Click “Sửa” on lesson row'],[1,2,'handleOpenEditModal(lesson)'],[2,2,'readOnly guard; setEditingLesson(lesson); setIsModalOpen(true)'],[2,3,'Render editingLesson; onSubmit=handleSubmitForm'],[3,3,'useEffect populates existing fields; parse vocabulary document URLs'],[3,1,'Display edit form',true],[0,1,'Edit data; click “Lưu thay đổi”'],[1,3,'handleSubmit(event)'],[3,3,'Validate title, lessonNo and document URLs; trim cleanPayload'],
 'break [invalid input]: setErrorMsg; keep edit form open; no API request.',
 [3,3,'setSubmitting(true); clear error'],[3,2,'await onSubmit(cleanPayload) → handleSubmitForm'],[2,2,'Add skillType=VOCABULARY; editingLesson exists'],[2,4,'updateLesson(editingLesson.id, payload)'],[4,5,'PUT /lessons/{id} + payload'],
 'Guard: ADMIN/MODERATOR authority; @Valid LessonRequest. Invalid request → 400 → modal error; form remains open.',
 [5,7,'findById(id)'],[7,5,'Lesson / empty',true],
 'break [missing lesson]: return 404; frontend displays error and keeps form open.',
 [5,7,'existsByChapterIdAndSkillTypeAndDisplayOrderAndIdNot(...)'],[7,5,'boolean',true],
 'break [duplicate display order excluding current lesson]: return 409; frontend displays error.',
 [5,5,'Set skillType, lessonNo, title, description, documents, displayOrder, status'],[5,7,'save(lesson)'],[7,5,'Updated Lesson',true],[5,4,'200 OK + LessonResponse',true],[4,2,'Resolve updateLesson()',true],[2,2,'showNotification(success); await fetchLessons()'],
 'ref: View vocabulary lesson list — GET list using current status filter; setLessons(data).',
 [2,3,'Resolve onSubmit()',true],[3,2,'onClose → setIsModalOpen(false)'],[3,3,'finally setSubmitting(false)'],[2,1,'Display refreshed list + success notice',true],
 'Failure path: submit rejection → modal catch sets errorMsg; keep form open; finally submitting=false. ChapterRepository is not used on update.'
]);
diagram('05 - Delete vocabulary lesson',['Moderator','«browser»\nBrowser / React runtime','«boundary»\nModeratorLessonListTab','«module»\nlessonApi.ts','«controller»\nLessonController','«repository»\nLessonRepository'],[
 [0,1,'Click “Xóa” on lesson row'],[1,2,'setDeletingLesson(lesson)'],[2,1,'Display delete confirmation dialog',true],
 'opt [cancel]: close dialog using available cancel control → setDeletingLesson(null); no DELETE request.',
 [0,1,'Confirm deletion'],[1,2,'handleConfirmDelete()'],[2,2,'Guard readOnly / deletingLesson; setDeleting(true)'],[2,3,'await deleteLesson(deletingLesson.id)'],[3,4,'DELETE /lessons/{id}'],
 'Guard: ADMIN/MODERATOR authority. This flow deletes a lesson; it does not set ARCHIVED.',
 [4,5,'existsById(id)'],[5,4,'boolean',true],
 'break [not found]: return 404; frontend alert generic delete error; confirmation stays open; finally deleting=false.',
 [4,5,'deleteById(id)'],
 'break [DataIntegrityViolationException / linked records]: 409 + message “Không thể xóa bài học vì đang có dữ liệu liên kết ...”; frontend alerts message; keeps dialog.',
 [5,4,'Deletion completes',true],[4,3,'204 No Content',true],[3,2,'Resolve deleteLesson()',true],[2,2,'showNotification(success); setDeletingLesson(null); await fetchLessons()'],
 'ref: View vocabulary lesson list — reload lessons using current skill/status filter.',
 [2,2,'finally setDeleting(false)'],[2,1,'Render refreshed list + success notice',true]
]);
const out=path.join(__dirname,'vocabulary-lesson-sequences.drawio');
fs.writeFileSync(out,`<?xml version="1.0" encoding="UTF-8"?><mxfile host="Electron" type="device">${pages.join('')}</mxfile>`);
console.log(out+' — '+pages.length+' pages');
