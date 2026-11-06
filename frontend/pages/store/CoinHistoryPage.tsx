import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/api";
import "../feedback/FeedbackPage.css";
type Entry={id:number;direction:string;amount:number;balance_after:number;source_type:string;source_ref_id:number|null;description:string|null;created_at:string};
const sources:Record<string,string>={TEST:"Bài kiểm tra",PRACTICE:"Luyện tập",GAME:"Trò chơi",STORE:"Đổi vật phẩm",STREAK:"Chuỗi học tập",ADMIN:"Điều chỉnh",OTHER:"Khác"};
export function CoinHistoryPage(){
 const [page,setPage]=useState(0);const [selected,setSelected]=useState<number|null>(null);
 const list=useQuery({queryKey:["coin-history",page],queryFn:async()=>(await apiClient.get<{balance:number;content:Entry[];totalElements:number}>("/coins",{params:{page,size:10}})).data});
 const detail=useQuery({queryKey:["coin-detail",selected],enabled:selected!==null,queryFn:async()=>(await apiClient.get<Entry>(`/coins/${selected}`)).data});
 return <section className="feedback-page"><Link to="/store">← Cửa hàng</Link><h1>Lịch sử xu</h1>
 {list.isLoading&&<p>Đang tải lịch sử…</p>}
 {list.isError?<div className="feedback-error" role="alert">Không tải được lịch sử xu. <button onClick={()=>list.refetch()}>Thử lại</button></div>:list.data&&<div className="feedback-card"><h2>Số dư: {list.data.balance.toLocaleString("vi-VN")} xu</h2>
 {!list.data.content.length?<p>Chưa có giao dịch.</p>:<table><thead><tr><th>Thời gian</th><th>Nguồn / Mục đích</th><th>Số xu</th><th/></tr></thead><tbody>{list.data.content.map(e=><tr key={e.id}><td>{new Date(e.created_at).toLocaleString("vi-VN")}</td><td>{e.description||sources[e.source_type]||e.source_type}</td><td>{e.direction==="SPEND"?"−":"+"}{e.amount.toLocaleString("vi-VN")}</td><td><button onClick={()=>setSelected(e.id)}>Chi tiết</button></td></tr>)}</tbody></table>}
 <div className="feedback-actions"><button disabled={!page} onClick={()=>setPage(page-1)}>Trước</button><span>Trang {page+1}</span><button disabled={(page+1)*10>=list.data.totalElements} onClick={()=>setPage(page+1)}>Sau</button></div></div>}
 {selected!==null&&<div className="feedback-card"><button onClick={()=>setSelected(null)}>Về lịch sử</button><h2>Giao dịch #{selected}</h2>{detail.isLoading&&<p>Đang tải…</p>}{detail.isError?<p role="alert">Không thể xem giao dịch. <button onClick={()=>detail.refetch()}>Thử lại</button></p>:detail.data&&<><p>{detail.data.description||sources[detail.data.source_type]}</p><p>{detail.data.direction==="SPEND"?"Chi":"Nhận"}: {detail.data.amount} xu</p><p>Số dư sau giao dịch: {detail.data.balance_after} xu</p><p>{new Date(detail.data.created_at).toLocaleString("vi-VN")}</p><p>Tham chiếu: {sources[detail.data.source_type]} {detail.data.source_ref_id??"—"}</p></>}</div>}
 </section>;
}
