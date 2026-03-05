import streamlit as st
from supabase import create_client
import pandas as pd

# 1. 基础配置与连接
st.set_page_config(page_title="Incremental Findings | 渐进式发现", layout="wide")
url, key = st.secrets["SUPABASE_URL"], st.secrets["SUPABASE_KEY"]
supabase = create_client(url, key)

# 2. 侧边栏：角色切换与分类
st.sidebar.title("🏛️ 角色控制")
role = st.sidebar.radio("当前视图", ["读者 (Reader)", "作者 (Author)", "编辑 (Editor)"])

st.sidebar.divider()
category_filter = st.sidebar.multiselect("研究领域筛选", ["数学", "物理", "计算机", "生命科学", "其他"])

# 3. 页面主体逻辑
if role == "读者 (Reader)":
    st.title("📚 最新科研发现")
    st.caption("展示所有经过初步形式审查的渐进式成果")
    
    # 从数据库抓取数据
    response = supabase.table("submission").select("*").order("created_at", desc=True).execute()
    papers = response.data
    
    if papers:
        for p in papers:
            with st.container(border=True):
                col1, col2 = st.columns([4, 1])
                with col1:
                    st.subheader(p['title'])
                    st.write(f"**原投递目标**: {p['journal']} | **日期**: {p['created_at'][:10]}")
                with col2:
                    # 指向你在 Supabase 的 Public URL
                    st.link_button("阅读 PDF", f"{url}/storage/v1/object/public/papers/{p['file_url']}")
                st.info(f"**复盘说明**: {p['review']}")
    else:
        st.write("目前尚无公开论文。")

elif role == "作者 (Author)":
    st.title("📤 提交您的发现")
    with st.form("author_form", clear_on_submit=True):
        t = st.text_input("论文标题")
        j = st.text_input("原投稿期刊")
        c = st.selectbox("学科类别", ["数学", "物理", "计算机", "生命科学", "其他"])
        r = st.text_area("研究价值复盘")
        f = st.file_uploader("上传 PDF", type="pdf")
        
        if st.form_submit_button("提交审查"):
            if t and f:
                # 处理上传逻辑
                supabase.storage.from_("papers").upload(f.name, f.getvalue())
                supabase.table("submission").insert({"title":t, "journal":j, "review":r, "file_url":f.name}).execute()
                st.success("提交成功，请等待编辑形式审查。")

elif role == "编辑 (Editor)":
    st.title("⚖️ 稿件管理系统")
    st.write("（此处未来可接入审核、退修、发布等功能）")
    st.warning("编辑后台仅供内部使用。")

st.sidebar.caption("© 2026 Incremental Findings Project")
