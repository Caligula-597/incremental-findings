import streamlit as st 
from supabase import create_client 
import time 

# 1. 基础配置 
st.set_page_config(page_title="Incremental Findings", page_icon="🔬", layout="wide") 

# 注入自定义 CSS 以模仿 Nature 的极简风格 
st.markdown(""" 
    <style> 
    /* 引入学术衬线字体 */ 
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+Pro&display=swap'); 
    
    .main { background-color: #ffffff; color: #111; font-family: 'Source Sans Pro', sans-serif; } 
    
    /* 模仿 Nature 的大标题 */ 
    .stHeading h1 { 
        font-family: 'Playfair Display', serif; 
        font-size: 3rem !important; 
        border-bottom: 3px solid #000; 
        margin-bottom: 30px; 
    } 
    
    /* 论文卡片设计 */ 
    div[data-testid="stVerticalBlock"] > div:has(div.stButton) { 
        border-top: 1px solid #eee; 
        padding: 20px 0; 
        transition: 0.3s; 
    } 
    div[data-testid="stVerticalBlock"] > div:has(div.stButton):hover { 
        background-color: #fcfcfc; 
    } 
    </style> 
    """, unsafe_allow_html=True) 

# 2. Supabase 连接 
url, key = st.secrets["SUPABASE_URL"], st.secrets["SUPABASE_KEY"] 
supabase = create_client(url, key) 

# 3. 首页头部 
st.title("Nature Incremental Findings") 
st.caption("THE WORLD'S LEADING REJECTED RESEARCH PLATFORM") 

# 4. 侧边栏：模拟登录与功能 
with st.sidebar: 
    st.subheader("Login / Register") 
    view_mode = st.radio("Access Level", ["Public Reader", "Author Dashboard", "Editor Panel"]) 
    st.divider() 
    st.info("Explore research by categories like Mathematics, Physics, and AI.") 
    st.caption("© 2026 Incremental Findings Project") 

# 5. 主页面逻辑 
if view_mode == "Public Reader": 
    # A. 获取数据 
    res = supabase.table("submission").select("*").eq("status", "published").order("created_at", desc=True).execute() 
    papers = res.data 

    if papers and len(papers) > 0: 
        # 头条区域 (最新的一篇) 
        latest = papers[0] 
        col_img, col_txt = st.columns([1.5, 1]) 
        with col_img: 
            # 这里可以放一张学术配图 
            st.image("https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800", use_container_width=True) 
        with col_txt: 
            st.header(latest['title']) 
            st.write(f"**Origin**: {latest['journal']} | **Field**: Mathematics") 
            st.markdown(f"> {latest['review'][:200]}...") 
            st.link_button("Read Full PDF", f"{url}/storage/v1/object/public/papers/{latest['file_url']}") 
        
        st.divider() 
        
        # B. 瀑布流区域 (其余论文) 
        cols = st.columns(3) 
        for i, p in enumerate(papers[1:]): 
            with cols[i % 3]: 
                with st.container(border=True): 
                    st.subheader(p['title']) 
                    st.caption(f"Posted: {p['created_at'][:10]}") 
                    st.write(p['review'][:100] + "...") 
                    st.link_button("View Paper", f"{url}/storage/v1/object/public/papers/{p['file_url']}") 
    else: 
        st.write("No research published today.") 

elif view_mode == "Author Dashboard": 
    st.header("Author Submission Portal") 
    with st.form("author_form", clear_on_submit=True): 
        t = st.text_input("论文标题") 
        j = st.text_input("原投稿期刊") 
        c = st.selectbox("学科类别", ["数学", "物理", "计算机", "生命科学", "其他"]) 
        r = st.text_area("研究价值复盘") 
        f = st.file_uploader("上传 PDF", type="pdf") 
        
        if st.form_submit_button("提交审查"): 
            if t and f: 
                # 处理上传逻辑 
                file_name = f"{int(time.time())}_{f.name}" 
                supabase.storage.from_("papers").upload(file_name, f.getvalue()) 
                supabase.table("submission").insert({"title":t, "journal":j, "review":r, "file_url":file_name, "status":"pending"}).execute() 
                st.success("提交成功，请等待编辑形式审查。")

elif view_mode == "Editor Panel": 
    st.header("Editor Management System") 
    # 获取待审核的稿件 
    res = supabase.table("submission").select("*").eq("status", "pending").order("created_at", desc=True).execute() 
    pending_papers = res.data 
    
    if pending_papers and len(pending_papers) > 0: 
        st.subheader("Pending Submissions") 
        for i, p in enumerate(pending_papers): 
            with st.container(border=True): 
                st.subheader(p['title']) 
                st.caption(f"Submitted: {p['created_at'][:10]}") 
                st.write(f"**Journal**: {p['journal']}") 
                st.write(f"**Review**: {p['review'][:200]}...") 
                st.link_button("View PDF", f"{url}/storage/v1/object/public/papers/{p['file_url']}") 
                if st.button(f"Publish", key=f"publish_{i}"): 
                    # 更新状态为 published 
                    supabase.table("submission").update({"status": "published"}).eq("id", p['id']).execute() 
                    st.success(f"Published: {p['title']}") 
                    # 刷新页面 
                    st.experimental_rerun() 
    else: 
        st.write("No pending submissions.") 
    
    st.divider() 
    
    # 获取已发布的稿件 
    res_published = supabase.table("submission").select("*").eq("status", "published").order("created_at", desc=True).execute() 
    published_papers = res_published.data 
    
    if published_papers and len(published_papers) > 0: 
        st.subheader("Published Submissions") 
        for p in published_papers: 
            with st.container(border=True): 
                st.subheader(p['title']) 
                st.caption(f"Published: {p['created_at'][:10]}") 
                st.write(f"**Journal**: {p['journal']}") 
                st.link_button("View PDF", f"{url}/storage/v1/object/public/papers/{p['file_url']}") 
    st.warning("Editor panel is for internal use only.")
