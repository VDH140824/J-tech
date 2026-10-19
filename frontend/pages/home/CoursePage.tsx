import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourse, type CourseDetail } from "../../api/courseApi";
export function CoursePage(){ const {courseId}=useParams(); const navigate=useNavigate(); const [course,setCourse]=useState<CourseDetail>(); useEffect(()=>{if(courseId) getCourse(Number(courseId)).then(setCourse);},[courseId]); if(!course) return <div>Ðang t?i...</div>; return <main style={{padding:"32px"}}><button onClick={()=>navigate("/home")}>? Trang ch?</button><h1>{course.name}</h1><p>{course.description}</p><h2>Danh sách chuong</h2>{course.chapters.map(ch=><article key={ch.id}><h3>Chuong {ch.chapterNo}: {ch.title}</h3><p>{ch.description}</p></article>)}</main>; }
