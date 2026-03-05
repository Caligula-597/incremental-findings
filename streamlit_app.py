import streamlit as st
from supabase import create_client

# 1. 建立连接
# 确保在 Streamlit Settings -> Secrets 填好了 SUPABASE_URL 和 SUPABASE_KEY
url = st.secrets["SUPABASE_URL"]
key = st.secrets["SUPABASE_KEY"]
supabase = create_client(url, key)

st.title("🔬 Incremental Findings")
st.write("渐进式发现：为每一份科研价值留存空间")

# 2. 提交表单
with st.form("upload_form", clear_on_submit=True):
    title = st.text_input("论文/研究标题")
    journal = st.text_input("原投递目标")
    review = st.text_area("研究复盘说明")
    pdf_file = st.file_uploader("上传 PDF 论文", type=["pdf"])
    
    if st.form_submit_button("确认提交"):
        if title and pdf_file:
            try:
                # A. 上传 PDF 到存储桶
                file_path = f"{pdf_file.name}"
                supabase.storage.from_("papers").upload(file_path, pdf_file.getvalue())
                
                # B. 将信息写入数据库表 (对应你刚才建的 submission 表)
                supabase.table("submission").insert({
                    "title": title,
                    "journal": journal,
                    "review": review,
                    "file_url": file_path
                }).execute()
                
                st.success(f"🎉 提交成功！'{title}' 已存入云端数据库。")
            except Exception as e:
                st.error(f"处理出错：{e}。请确认数据库表名和存储桶名是否正确。")
        else:
            st.warning("请填写完整标题并上传文件。")
