import streamlit as st

# 1. 页面配置
st.set_page_config(page_title="Incremental Findings", page_icon="🔬", layout="centered")

# 2. 网站头部
st.title("🔬 Incremental Findings")
st.subheader("渐进式发现：收录被低估的研究价值")
st.markdown("""
本站旨在为科学界提供一个“避风港”。我们收录那些因为各种原因（如新颖性不足、负面结果等）未能在顶级期刊发表，
但在实验数据、方法论或理论边界上对同行具有参考价值的研究成果。
""")

st.divider()

# 3. 核心功能展示区
tab1, tab2 = st.tabs(["📚 论文浏览", "📤 提交研究"])

with tab1:
    st.info("目前平台处于 Beta 测试阶段，暂无公开展示的论文。")
    # 未来这里会从数据库读取数据并显示
    st.write("待收录类别：")
    st.write("- 阴性结果 (Negative Results)")
    st.write("- 渐进式改进 (Incremental Improvements)")
    st.write("- 实验数据集 (Datasets)")

with tab2:
    st.markdown("### 提交您的科研成果")
    with st.form("upload_form"):
        paper_title = st.text_input("论文标题")
        original_journal = st.text_input("原投稿目标 (如：Nature, IEEE, PRL 等)")
        rejection_review = st.text_area("被拒复盘 (请简述评审争议点及本研究的剩余价值)")
        pdf_file = st.file_uploader("上传 PDF 论文", type=["pdf"])
        
        submitted = st.form_submit_button("确认提交")
        if submitted:
            if paper_title and pdf_file:
                st.success("提交成功！我们将进行初步审核。")
            else:
                st.warning("请填写标题并上传文件。")

# 4. 页脚
st.divider()
st.caption("© 2026 Incremental Findings Project | 倡导开放科学与科研诚信")