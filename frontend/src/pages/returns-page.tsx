export default function ReturnsPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-montserrat font-bold text-primary mb-2">
        Return &amp; Refund Policy
      </h1>
      <p className="text-secondary mb-8">
        Thank you for shopping with us. We want you to be satisfied with your
        purchase of exercise, injury, performance, rehabilitation, and recovery
        products.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-montserrat font-bold text-primary mb-2">
            1. 30-Day Return Policy
          </h2>
          <p className="text-secondary mb-2">
            You may request a return within <strong>30 days of the date your order was delivered</strong>.
          </p>
          <p className="text-secondary mb-2">To qualify for a return, the product must:</p>
          <ul className="list-disc pl-6 space-y-1 text-secondary">
            <li>Be unused and in new condition.</li>
            <li>Be in its original packaging.</li>
            <li>Include all original accessories, instructions, and components.</li>
            <li>Not show signs of use, damage, alteration, or excessive handling.</li>
            <li>Be returned with proof of purchase or order information.</li>
          </ul>
          <p className="text-secondary mt-2">
            We reserve the right to refuse a return if the product does not meet
            these requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-montserrat font-bold text-primary mb-2">
            2. Products That Cannot Be Returned
          </h2>
          <p className="text-secondary mb-2">
            For health, safety, and hygiene reasons, certain products may not be
            eligible for return once opened or used. These may include:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-secondary">
            <li>Compression garments or other worn products.</li>
            <li>Athletic or kinesiology tape once opened.</li>
            <li>Topical creams, gels, balms, lotions, or similar products once opened.</li>
            <li>Personal-use or hygiene-sensitive products.</li>
            <li>Products that have been used for exercise, rehabilitation, treatment, or recovery.</li>
            <li>Clearance, closeout, or final-sale products when identified as such at the time of purchase.</li>
            <li>Customized or specially ordered products.</li>
          </ul>
          <p className="text-secondary mt-2">
            If you are unsure whether an item can be returned, please contact
            customer service before opening or using the product.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-montserrat font-bold text-primary mb-2">
            3. Defective or Damaged Products
          </h2>
          <p className="text-secondary mb-2">
            If your order arrives damaged, defective, or incorrect, please contact
            us within <strong>7 days of delivery</strong>. Please provide:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-secondary">
            <li>Your order number.</li>
            <li>A description of the problem.</li>
            <li>Photographs of the product and packaging when applicable.</li>
          </ul>
          <p className="text-secondary mt-2">
            If the product is confirmed to be defective, damaged during shipment,
            or incorrectly shipped, we may provide a replacement, exchange, or
            full refund, including applicable return shipping costs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-montserrat font-bold text-primary mb-2">4. Exchanges</h2>
          <p className="text-secondary">
            If you received the wrong product or a defective product, we will work
            with you to arrange an exchange when the product is available. For
            size, color, or preference-based exchanges, the product must meet our
            standard return requirements. Additional shipping charges may apply.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-montserrat font-bold text-primary mb-2">5. Return Shipping</h2>
          <p className="text-secondary">
            For returns due to customer preference, incorrect size, ordering the
            wrong product, or changing your mind, the customer is generally
            responsible for return shipping costs. If the return is the result of
            our error, a defective product, or damage that occurred during
            shipping, we will provide appropriate return-shipping assistance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-montserrat font-bold text-primary mb-2">6. Refunds</h2>
          <p className="text-secondary">
            Once your returned product is received and inspected, we will notify
            you whether your return has been approved. Approved refunds will
            generally be issued to the <strong>original method of payment</strong>.
            Please allow several business days for your financial institution or
            payment provider to process the refund after it has been issued.
            Original shipping charges are generally non-refundable unless the
            return is due to our error, a defective product, or a shipping-related
            problem.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-montserrat font-bold text-primary mb-2">7. Return Authorization</h2>
          <p className="text-secondary mb-2">
            Please contact customer service before sending a product back.
            Unauthorized returns may be delayed or may not be accepted.
          </p>
          <p className="text-secondary">
            Customer Service:{" "}
            <a href="mailto:info@activerecovery360.com" className="text-primary hover:underline">
              info@activerecovery360.com
            </a>
          </p>
          <p className="text-secondary">Phone: (602) 726-0789</p>
          <p className="text-secondary mt-2">
            Please include your order number with your return.
          </p>
        </section>
      </div>
    </div>
  );
}
