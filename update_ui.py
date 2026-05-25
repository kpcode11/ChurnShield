import os

file_path = r"c:\Users\praja\OneDrive\Desktop\ChurnShield\client\src\pages\PredictCustomer.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add states
old_states = """  const [maritalStatus, setMaritalStatus] = useState("Single");"""
new_states = old_states + """
  const [totalSpend, setTotalSpend] = useState("500");
  const [avgOrderValue, setAvgOrderValue] = useState("100");
  const [returnRate, setReturnRate] = useState([0.1]);
  const [customerAge, setCustomerAge] = useState([30]);
  const [lastLoginDaysAgo, setLastLoginDaysAgo] = useState("5");
  const [reviewsGiven, setReviewsGiven] = useState("0");
  const [wishlistItems, setWishlistItems] = useState("0");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Free");
  const [referralsMade, setReferralsMade] = useState("0");
  const [supportTicketCount, setSupportTicketCount] = useState("0");"""
content = content.replace(old_states, new_states)

# 2. Add to payload
old_payload = """      PreferedOrderCat:            orderCat,
      MaritalStatus:               maritalStatus,"""
new_payload = old_payload + """
      TotalSpend:                  parseFloat(totalSpend) || 0,
      AvgOrderValue:               parseFloat(avgOrderValue) || 0,
      ReturnRate:                  returnRate[0],
      CustomerAge:                 customerAge[0],
      LastLoginDaysAgo:            parseFloat(lastLoginDaysAgo) || 0,
      ReviewsGiven:                parseFloat(reviewsGiven) || 0,
      WishlistItems:               parseFloat(wishlistItems) || 0,
      SubscriptionPlan:            subscriptionPlan,
      ReferralsMade:               parseFloat(referralsMade) || 0,
      SupportTicketCount:          parseFloat(supportTicketCount) || 0,"""
content = content.replace(old_payload, new_payload)

# 3. Update text from 18 to 28
content = content.replace("All 18 model features", "All 28 model features")
content = content.replace("18 features", "28 features")
content = content.replace("All 18 Features Sent to Model", "All 28 Features Sent to Model")
content = content.replace("all 18 features", "all 28 features")

# 4. Update UI Sections
# Account & Lifecycle
old_account = """<SelectField label="Marital Status" value={maritalStatus} onChange={setMaritalStatus}"""
new_account = """<SliderField label="Customer Age" value={customerAge} onChange={setCustomerAge} min={18} max={100} />
            <SelectField label="Subscription Plan" value={subscriptionPlan} onChange={setSubscriptionPlan}
              options={[
                { value: "Free", label: "Free" },
                { value: "Silver", label: "Silver" },
                { value: "Gold", label: "Gold" },
                { value: "Platinum", label: "Platinum" },
              ]}
            />
            <SelectField label="Marital Status" value={maritalStatus} onChange={setMaritalStatus}"""
content = content.replace(old_account, new_account)

# Engagement
old_engagement = """<SliderField label="Devices Registered" value={numDevices} onChange={setNumDevices} min={1} max={6} />"""
new_engagement = old_engagement + """
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Last Login Days Ago" value={lastLoginDaysAgo} onChange={setLastLoginDaysAgo} />
              <NumberField label="Wishlist Items" value={wishlistItems} onChange={setWishlistItems} />
            </div>
            <NumberField label="Referrals Made" value={referralsMade} onChange={setReferralsMade} />"""
content = content.replace(old_engagement, new_engagement)

# Orders & Spend
old_orders = """<NumberField label="Coupons Used" value={couponsUsed} onChange={setCouponsUsed} />"""
new_orders = old_orders + """
              <NumberField label="Total Spend (₹)" value={totalSpend} onChange={setTotalSpend} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Avg Order Value (₹)" value={avgOrderValue} onChange={setAvgOrderValue} />
              <div className="pt-2">
                <SliderField label="Return Rate" value={returnRate} onChange={setReturnRate} max={1} step={0.01} />
              </div>"""
content = content.replace(old_orders, new_orders)

# Satisfaction
old_satisfaction = """<div className="flex items-center justify-between pt-1">"""
new_satisfaction = """<div className="grid grid-cols-2 gap-3">
              <NumberField label="Reviews Given" value={reviewsGiven} onChange={setReviewsGiven} />
              <NumberField label="Support Tickets" value={supportTicketCount} onChange={setSupportTicketCount} />
            </div>
            <div className="flex items-center justify-between pt-1">"""
content = content.replace(old_satisfaction, new_satisfaction)

# Array Summary
old_array = """["Marital",       maritalStatus],"""
new_array = old_array + """
                    ["Age",           `${customerAge[0]}`],
                    ["Plan",          subscriptionPlan],
                    ["Last Login",    `${lastLoginDaysAgo}d ago`],
                    ["Wishlist",      wishlistItems],
                    ["Referrals",     referralsMade],
                    ["Total Spend",   `₹${totalSpend}`],
                    ["Avg Order Val", `₹${avgOrderValue}`],
                    ["Return Rate",   `${Math.round(returnRate[0] * 100)}%`],
                    ["Reviews",       reviewsGiven],
                    ["Tickets",       supportTicketCount],"""
content = content.replace(old_array, new_array)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully")
