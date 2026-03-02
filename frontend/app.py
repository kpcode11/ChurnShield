"""
Layer 5 — Streamlit Frontend
Complete UI for all 6 ChurnShield modules.
"""

import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import io
import json

# ──────────────────── CONFIG ────────────────────
API_URL = "http://localhost:8000"

st.set_page_config(
    page_title="ChurnShield",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ──────────────────── CUSTOM CSS ────────────────────
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1B2A4A;
        text-align: center;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #6B7280;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 1rem;
        color: white;
        text-align: center;
    }
    .risk-high { color: #EF4444; font-weight: 700; font-size: 1.5rem; }
    .risk-medium { color: #F59E0B; font-weight: 700; font-size: 1.5rem; }
    .risk-low { color: #10B981; font-weight: 700; font-size: 1.5rem; }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
</style>
""", unsafe_allow_html=True)

# ──────────────────── SIDEBAR ────────────────────
st.sidebar.image("https://img.icons8.com/fluency/96/shield.png", width=80)
st.sidebar.title("🛡️ ChurnShield")
st.sidebar.markdown("**Customer Retention Intelligence**")
st.sidebar.markdown("---")

module = st.sidebar.radio(
    "Navigate",
    [
        "🏠 Home",
        "🔮 Churn Prediction",
        "📊 Analytics Dashboard",
        "📁 Bulk CSV Prediction",
        "💰 Revenue Calculator",
        "💡 Retention Suggestions",
        "✉️ AI Message Generator",
    ],
)

st.sidebar.markdown("---")
st.sidebar.markdown(
    "<small>Built with ❤️ using FastAPI + Streamlit + XGBoost</small>",
    unsafe_allow_html=True,
)


# ══════════════════════════════════════════════════
#  HELPER
# ══════════════════════════════════════════════════

def api_post(endpoint, data=None, files=None):
    """Send POST request to FastAPI backend."""
    try:
        if files:
            r = requests.post(f"{API_URL}{endpoint}", files=files, timeout=60)
        else:
            r = requests.post(f"{API_URL}{endpoint}", json=data, timeout=30)
        r.raise_for_status()
        return r
    except requests.exceptions.ConnectionError:
        st.error("⚠️ Cannot connect to backend. Make sure the FastAPI server is running on port 8000.")
        return None
    except Exception as e:
        st.error(f"API Error: {e}")
        return None


def api_get(endpoint):
    """Send GET request to FastAPI backend."""
    try:
        r = requests.get(f"{API_URL}{endpoint}", timeout=30)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        st.error("⚠️ Cannot connect to backend. Make sure the FastAPI server is running on port 8000.")
        return None
    except Exception as e:
        st.error(f"API Error: {e}")
        return None


# ══════════════════════════════════════════════════
#  MODULE 0: HOME
# ══════════════════════════════════════════════════

if module == "🏠 Home":
    st.markdown('<p class="main-header">🛡️ ChurnShield</p>', unsafe_allow_html=True)
    st.markdown(
        '<p class="sub-header">Predict. Prevent. Protect Revenue.</p>',
        unsafe_allow_html=True,
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("""
        ### 🔮 Predict
        Identify which customers are about to leave
        using ML-powered churn scoring.
        """)
    with col2:
        st.markdown("""
        ### 🛡️ Prevent
        Get smart retention suggestions and
        AI-generated personalised messages.
        """)
    with col3:
        st.markdown("""
        ### 💰 Protect
        Calculate revenue at risk and the ROI
        of your retention campaigns.
        """)

    st.markdown("---")

    # Value proposition
    st.markdown("### 💡 Why ChurnShield?")
    c1, c2 = st.columns(2)
    with c1:
        st.error("**Without ChurnShield**")
        st.markdown("""
        - Send ₹50 coupon to **all 1,00,000** customers
        - Cost: **₹50,00,000**
        - Wasted budget on loyal customers
        """)
    with c2:
        st.success("**With ChurnShield**")
        st.markdown("""
        - Send coupon only to **8,500 at-risk** customers
        - Cost: **₹4,25,000**
        - **Savings: ₹45.75 Lakhs** 🎉
        """)

    st.markdown("---")
    st.markdown("### 🧩 6 Integrated Modules")
    modules_info = {
        "🔮 Churn Prediction Engine": "Enter customer details → instant risk score",
        "📊 Live Analytics Dashboard": "Visual overview of your entire customer base",
        "📁 Bulk CSV Prediction": "Upload thousands of customers → scored Excel report",
        "💰 Revenue Impact Calculator": "Translate predictions into money",
        "💡 Smart Retention Suggestions": "Targeted retention actions per customer",
        "✉️ AI Message Generator": "Personalised emails/WhatsApp in seconds",
    }
    cols = st.columns(3)
    for i, (name, desc) in enumerate(modules_info.items()):
        with cols[i % 3]:
            st.info(f"**{name}**\n\n{desc}")


# ══════════════════════════════════════════════════
#  MODULE 1: SINGLE CUSTOMER PREDICTION
# ══════════════════════════════════════════════════

elif module == "🔮 Churn Prediction":
    st.header("🔮 Churn Prediction Engine")
    st.markdown("Enter customer details below to get an instant churn risk score.")

    with st.form("predict_form"):
        col1, col2, col3 = st.columns(3)

        with col1:
            tenure = st.number_input("Tenure (months)", 0, 100, 12)
            city_tier = st.selectbox("City Tier", [1, 2, 3])
            satisfaction = st.slider("Satisfaction Score", 1, 5, 3)
            complain = st.selectbox("Raised Complaint?", [0, 1], format_func=lambda x: "Yes" if x else "No")
            warehouse = st.number_input("Warehouse to Home (km)", 1, 200, 15)
            gender = st.selectbox("Gender", ["Male", "Female"])

        with col2:
            login_device = st.selectbox("Preferred Login Device", ["Mobile Phone", "Computer", "Phone"])
            payment_mode = st.selectbox("Payment Mode", ["Debit Card", "UPI", "Credit Card", "Cash on Delivery", "E wallet"])
            order_cat = st.selectbox("Preferred Order Category", ["Laptop & Accessory", "Mobile Phone", "Fashion", "Grocery", "Others"])
            marital = st.selectbox("Marital Status", ["Single", "Married", "Divorced"])

        with col3:
            hour_app = st.number_input("Hours on App", 0.0, 10.0, 3.0)
            num_devices = st.number_input("Devices Registered", 1, 10, 3)
            num_address = st.number_input("Number of Addresses", 1, 25, 2)
            order_hike = st.number_input("Order Amount Hike (%)", 0.0, 50.0, 15.0)
            coupon_used = st.number_input("Coupons Used", 0.0, 20.0, 1.0)
            order_count = st.number_input("Order Count", 1.0, 20.0, 2.0)
            days_since = st.number_input("Days Since Last Order", 0.0, 100.0, 5.0)
            cashback = st.number_input("Cashback Amount (₹)", 0.0, 500.0, 150.0)

        submitted = st.form_submit_button("🔍 Predict Churn", use_container_width=True)

    if submitted:
        payload = {
            "Tenure": tenure,
            "PreferredLoginDevice": login_device,
            "CityTier": city_tier,
            "WarehouseToHome": warehouse,
            "PreferredPaymentMode": payment_mode,
            "Gender": gender,
            "HourSpendOnApp": hour_app,
            "NumberOfDeviceRegistered": num_devices,
            "PreferedOrderCat": order_cat,
            "SatisfactionScore": satisfaction,
            "MaritalStatus": marital,
            "NumberOfAddress": num_address,
            "Complain": complain,
            "OrderAmountHikeFromlastYear": order_hike,
            "CouponUsed": coupon_used,
            "OrderCount": order_count,
            "DaySinceLastOrder": days_since,
            "CashbackAmount": cashback,
        }
        resp = api_post("/predict", payload)
        if resp:
            result = resp.json()
            st.markdown("---")
            st.subheader("Prediction Result")

            c1, c2, c3 = st.columns(3)
            risk = result["risk"]
            risk_class = f"risk-{risk.lower()}"
            risk_emoji = {"Low": "🟢", "Medium": "🟡", "High": "🔴"}[risk]

            with c1:
                st.metric("Churn Prediction", "Will Churn" if result["churn"] == 1 else "Will Stay")
            with c2:
                st.metric("Churn Probability", f"{result['probability'] * 100:.1f}%")
            with c3:
                st.markdown(f"**Risk Level**")
                st.markdown(f'<p class="{risk_class}">{risk_emoji} {risk} Risk</p>', unsafe_allow_html=True)

            # Show gauge chart
            fig = go.Figure(go.Indicator(
                mode="gauge+number",
                value=result["probability"] * 100,
                title={"text": "Churn Risk Score"},
                gauge={
                    "axis": {"range": [0, 100]},
                    "bar": {"color": "#EF4444" if risk == "High" else "#F59E0B" if risk == "Medium" else "#10B981"},
                    "steps": [
                        {"range": [0, 30], "color": "#D1FAE5"},
                        {"range": [30, 60], "color": "#FEF3C7"},
                        {"range": [60, 100], "color": "#FEE2E2"},
                    ],
                },
            ))
            fig.update_layout(height=300)
            st.plotly_chart(fig, use_container_width=True)


# ══════════════════════════════════════════════════
#  MODULE 3: ANALYTICS DASHBOARD
# ══════════════════════════════════════════════════

elif module == "📊 Analytics Dashboard":
    st.header("📊 Live Analytics Dashboard")
    st.markdown("Visual overview of your entire customer base.")

    data = api_get("/analytics")
    if data:
        # KPI Cards
        k1, k2, k3, k4 = st.columns(4)
        k1.metric("Total Customers", f"{data['total_customers']:,}")
        k2.metric("Churned", f"{data['churned_customers']:,}")
        k3.metric("Churn Rate", f"{data['overall_churn_rate']}%")
        k4.metric("Avg Days (Churned)", f"{data['avg_days_since_last_order']['churned']}")

        st.markdown("---")

        # Row 1: City Tier + Gender
        col1, col2 = st.columns(2)
        with col1:
            city_data = data["churn_by_city_tier"]
            fig = px.bar(
                x=list(city_data.keys()),
                y=list(city_data.values()),
                labels={"x": "City Tier", "y": "Churn Rate (%)"},
                title="Churn Rate by City Tier",
                color=list(city_data.values()),
                color_continuous_scale="RdYlGn_r",
            )
            fig.update_layout(showlegend=False)
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            gender_data = data["churn_by_gender"]
            fig = px.pie(
                names=list(gender_data.keys()),
                values=list(gender_data.values()),
                title="Churn Rate by Gender",
                color_discrete_sequence=["#667eea", "#f093fb"],
            )
            st.plotly_chart(fig, use_container_width=True)

        # Row 2: Satisfaction + Device
        col3, col4 = st.columns(2)
        with col3:
            sat_data = data["churn_by_satisfaction"]
            fig = px.bar(
                x=list(sat_data.keys()),
                y=list(sat_data.values()),
                labels={"x": "Satisfaction Score", "y": "Churn Rate (%)"},
                title="Churn Rate by Satisfaction Score",
                color=list(sat_data.values()),
                color_continuous_scale="RdYlGn_r",
            )
            fig.update_layout(showlegend=False)
            st.plotly_chart(fig, use_container_width=True)

        with col4:
            dev_data = data["churn_by_device"]
            fig = px.bar(
                x=list(dev_data.keys()),
                y=list(dev_data.values()),
                labels={"x": "Login Device", "y": "Churn Rate (%)"},
                title="Churn Rate by Login Device",
                color=list(dev_data.values()),
                color_continuous_scale="Viridis",
            )
            fig.update_layout(showlegend=False)
            st.plotly_chart(fig, use_container_width=True)

        # Row 3: Tenure trend + Category
        col5, col6 = st.columns(2)
        with col5:
            tenure_data = data["churn_by_tenure"]
            fig = px.line(
                x=list(tenure_data.keys()),
                y=list(tenure_data.values()),
                labels={"x": "Tenure (months)", "y": "Churn Rate (%)"},
                title="Churn Rate by Tenure Bucket",
                markers=True,
            )
            fig.update_traces(line_color="#764ba2", line_width=3)
            st.plotly_chart(fig, use_container_width=True)

        with col6:
            cat_data = data["churn_by_category"]
            fig = px.bar(
                x=list(cat_data.values()),
                y=list(cat_data.keys()),
                orientation="h",
                labels={"x": "Churn Rate (%)", "y": "Category"},
                title="Churn Rate by Order Category",
                color=list(cat_data.values()),
                color_continuous_scale="Sunset",
            )
            fig.update_layout(showlegend=False)
            st.plotly_chart(fig, use_container_width=True)

        # Churned vs Stayed comparison
        st.markdown("### 📈 Days Since Last Order: Churned vs Stayed")
        days_data = data["avg_days_since_last_order"]
        fig = px.bar(
            x=["Churned", "Stayed"],
            y=[days_data["churned"], days_data["stayed"]],
            color=["Churned", "Stayed"],
            color_discrete_map={"Churned": "#EF4444", "Stayed": "#10B981"},
            labels={"x": "", "y": "Avg Days Since Last Order"},
        )
        fig.update_layout(showlegend=False, height=350)
        st.plotly_chart(fig, use_container_width=True)


# ══════════════════════════════════════════════════
#  MODULE 2: BULK CSV PREDICTION
# ══════════════════════════════════════════════════

elif module == "📁 Bulk CSV Prediction":
    st.header("📁 Bulk CSV Prediction")
    st.markdown("Upload a CSV with customer data and download a scored Excel report.")

    st.info("**Required columns:** Tenure, CityTier, SatisfactionScore, DaySinceLastOrder, Complain, CashbackAmount, Gender, PreferredLoginDevice, etc.")

    uploaded = st.file_uploader("Upload CSV file", type=["csv"])

    if uploaded:
        df_preview = pd.read_csv(uploaded)
        st.markdown(f"**Uploaded:** {len(df_preview)} rows × {len(df_preview.columns)} columns")
        st.dataframe(df_preview.head(10), use_container_width=True)

        if st.button("🚀 Run Bulk Prediction", use_container_width=True):
            with st.spinner("Running predictions on all customers..."):
                uploaded.seek(0)
                resp = api_post("/bulk", files={"file": ("data.csv", uploaded.getvalue(), "text/csv")})

            if resp and resp.status_code == 200:
                st.success("✅ Predictions complete!")

                # Read the response Excel
                result_df = pd.read_excel(io.BytesIO(resp.content), engine="openpyxl")

                # Summary stats
                c1, c2, c3 = st.columns(3)
                high = len(result_df[result_df["Risk_Level"] == "High"])
                med = len(result_df[result_df["Risk_Level"] == "Medium"])
                low = len(result_df[result_df["Risk_Level"] == "Low"])
                c1.metric("🔴 High Risk", high)
                c2.metric("🟡 Medium Risk", med)
                c3.metric("🟢 Low Risk", low)

                # Show table
                st.dataframe(result_df, use_container_width=True)

                # Risk distribution chart
                fig = px.pie(
                    names=["High", "Medium", "Low"],
                    values=[high, med, low],
                    title="Risk Level Distribution",
                    color_discrete_sequence=["#EF4444", "#F59E0B", "#10B981"],
                )
                st.plotly_chart(fig, use_container_width=True)

                # Download button
                st.download_button(
                    label="📥 Download Excel Report",
                    data=resp.content,
                    file_name="churnshield_results.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True,
                )


# ══════════════════════════════════════════════════
#  MODULE 4: REVENUE CALCULATOR
# ══════════════════════════════════════════════════

elif module == "💰 Revenue Calculator":
    st.header("💰 Revenue Impact Calculator")
    st.markdown("See exactly how much revenue is at risk and calculate your campaign ROI.")

    with st.form("revenue_form"):
        col1, col2 = st.columns(2)
        with col1:
            at_risk = st.number_input("Customers at Risk", 1, 1000000, 8500)
            avg_order = st.number_input("Avg Order Value (₹)", 1.0, 100000.0, 1200.0)
        with col2:
            coupon = st.number_input("Coupon Amount (₹)", 0.0, 10000.0, 50.0)
            retention = st.slider("Expected Retention Rate (%)", 1, 100, 30)

        calc = st.form_submit_button("📊 Calculate Impact", use_container_width=True)

    if calc:
        resp = api_post("/revenue", {
            "at_risk_customers": at_risk,
            "avg_order_value": avg_order,
            "coupon_amount": coupon,
            "retention_rate": retention,
        })
        if resp:
            result = resp.json()
            st.markdown("---")
            st.subheader("📈 Revenue Impact Report")

            c1, c2, c3, c4 = st.columns(4)
            c1.metric("💸 Revenue at Risk", f"₹{result['revenue_at_risk']:,.0f}")
            c2.metric("📤 Campaign Cost", f"₹{result['campaign_cost']:,.0f}")
            c3.metric("💰 Revenue Saved", f"₹{result['revenue_saved']:,.0f}")
            c4.metric("🎯 Net ROI", f"₹{result['net_roi']:,.0f}")

            st.markdown("---")

            col1, col2 = st.columns(2)
            with col1:
                st.metric("Customers Retained", f"{result['customers_retained']:,}")
                st.metric("ROI Percentage", f"{result['roi_percentage']:.1f}%")

            with col2:
                # Waterfall chart
                fig = go.Figure(go.Waterfall(
                    name="Revenue",
                    orientation="v",
                    x=["Revenue at Risk", "Campaign Cost", "Revenue Saved", "Net ROI"],
                    y=[
                        result["revenue_at_risk"],
                        -result["campaign_cost"],
                        result["revenue_saved"],
                        result["net_roi"],
                    ],
                    connector={"line": {"color": "#6B7280"}},
                    increasing={"marker": {"color": "#10B981"}},
                    decreasing={"marker": {"color": "#EF4444"}},
                    totals={"marker": {"color": "#667eea"}},
                ))
                fig.update_layout(title="Revenue Waterfall", height=400)
                st.plotly_chart(fig, use_container_width=True)


# ══════════════════════════════════════════════════
#  MODULE 5: RETENTION SUGGESTIONS
# ══════════════════════════════════════════════════

elif module == "💡 Retention Suggestions":
    st.header("💡 Smart Retention Suggestions")
    st.markdown("Enter customer details to get a targeted retention recommendation.")

    with st.form("suggest_form"):
        col1, col2 = st.columns(2)
        with col1:
            days_since = st.number_input("Days Since Last Order", 0.0, 200.0, 5.0)
            satisfaction = st.slider("Satisfaction Score", 1, 5, 3)
            complain = st.selectbox("Raised Complaint?", [0, 1], format_func=lambda x: "Yes" if x else "No")
        with col2:
            cashback = st.number_input("Cashback Amount (₹)", 0.0, 500.0, 150.0)
            tenure = st.number_input("Tenure (months)", 0.0, 100.0, 12.0)

        suggest = st.form_submit_button("💡 Get Suggestion", use_container_width=True)

    if suggest:
        resp = api_post("/suggest", {
            "DaySinceLastOrder": days_since,
            "SatisfactionScore": satisfaction,
            "Complain": complain,
            "CashbackAmount": cashback,
            "Tenure": tenure,
        })
        if resp:
            result = resp.json()
            st.markdown("---")

            st.warning(f"**🔍 Identified Risk Factor:** {result['reason']}")
            st.success(f"**💡 Recommendation:** {result['suggestion']}")
            action_icons = {"email": "✉️", "call": "📞", "coupon": "🎟️"}
            icon = action_icons.get(result["action_type"], "📋")
            st.info(f"**{icon} Action Type:** {result['action_type'].upper()}")


# ══════════════════════════════════════════════════
#  MODULE 6: AI MESSAGE GENERATOR
# ══════════════════════════════════════════════════

elif module == "✉️ AI Message Generator":
    st.header("✉️ AI Message Generator")
    st.markdown("Generate personalised retention messages for at-risk customer segments.")

    with st.form("message_form"):
        segment = st.selectbox("Customer Segment", [
            "Inactive customer — no orders in 30+ days",
            "Complaint raised — unhappy customer",
            "Low satisfaction score — at risk",
            "New customer — less than 3 months tenure",
            "Low cashback — not incentivised enough",
        ])
        suggestion = st.text_area(
            "Retention Offer / Suggestion",
            value="₹100 cashback coupon on next order + free delivery",
            height=80,
        )
        tone = st.selectbox("Message Tone", [
            "warm, concise",
            "professional, formal",
            "casual, friendly",
            "urgent, persuasive",
        ])

        generate = st.form_submit_button("✨ Generate Message", use_container_width=True)

    if generate:
        with st.spinner("Generating message..."):
            resp = api_post("/message", {
                "customer_segment": segment,
                "suggestion": suggestion,
                "tone": tone,
            })
        if resp:
            result = resp.json()
            st.markdown("---")
            source_label = "🤖 AI Generated (Claude)" if result["source"] == "ai" else "📝 Template Based"
            st.caption(source_label)
            st.markdown(f"""
            <div style="background: #F0F9FF; border-left: 4px solid #667eea;
                        padding: 1.5rem; border-radius: 0.5rem; font-size: 1.1rem;
                        line-height: 1.8;">
                {result["message"]}
            </div>
            """, unsafe_allow_html=True)

            st.markdown("")
            st.code(result["message"], language=None)
            st.caption("Copy the message above to send via WhatsApp, Email, or SMS.")
