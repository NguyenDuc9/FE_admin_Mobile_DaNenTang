import Link from 'next/link';

export default function AdminPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] text-slate-900">
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-cyan-700">Bảng điều khiển</p>

          <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Quản trị cửa hàng
          </h2>

          <p className="mt-3 text-slate-600">
            Chọn một phân hệ để bắt đầu quản lý dữ liệu trong hệ thống.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Quản lý danh mục */}
          <Link
            href="/admin/categories"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-2xl text-cyan-700">
              #
            </div>

            <h3 className="mt-5 text-lg font-bold group-hover:text-cyan-700">
              Quản lý danh mục
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Thêm, chỉnh sửa, xóa và cập nhật trạng thái danh mục sản phẩm.
            </p>

            <span className="mt-5 inline-block text-sm font-bold text-cyan-700">
              Mở quản lý danh mục →
            </span>
          </Link>

          {/* Quản lý sản phẩm */}
          <Link
            href="/admin/products"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-2xl text-cyan-700">
              ▣
            </div>

            <h3 className="mt-5 text-lg font-bold group-hover:text-cyan-700">
              Quản lý sản phẩm
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Thêm, chỉnh sửa, xóa và theo dõi tồn kho sản phẩm.
            </p>

            <span className="mt-5 inline-block text-sm font-bold text-cyan-700">
              Mở quản lý sản phẩm →
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
