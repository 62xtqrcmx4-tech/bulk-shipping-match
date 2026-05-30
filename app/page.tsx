export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              面向大宗散货、集装箱货物与特种货的船货撮合原型系统
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              船源、货源、企业资质与联系申请的一体化撮合平台
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              平台支持货源发布、船源发布、企业资质提交、后台审核、条件筛选、申请联系、我的货源管理和我的船源管理。游客可浏览基础信息，登录用户可查看发布方认证状态并申请联系。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/cargo"
                className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                查看货源大厅
              </a>
              <a
                href="/vessels"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                查看船源大厅
              </a>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">当前系统能力</h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold">开放注册与企业资质提交</p>
                <p className="mt-1 text-sm text-slate-500">
                  用户注册时提交企业资料和营业执照，平台后台审核认证。
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold">货源 / 船源发布与审核</p>
                <p className="mt-1 text-sm text-slate-500">
                  发布信息进入待审核状态，管理员审核通过后进入大厅展示。
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold">多条件筛选与关键词搜索</p>
                <p className="mt-1 text-sm text-slate-500">
                  支持按货种、船型、港口、区域、备注、货量区间和运力区间筛选。
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold">可信联系机制</p>
                <p className="mt-1 text-sm text-slate-500">
                  申请联系前校验企业资料和证照状态，游客不能申请联系。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          <a
            href="/publish-cargo"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
          >
            <h3 className="text-xl font-bold">发布货源</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              填写货种、货量、装卸港、期望船型、备注和特殊要求，提交后等待平台审核。
            </p>
          </a>

          <a
            href="/publish-vessel"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
          >
            <h3 className="text-xl font-bold">发布船源</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              填写船型、运力规模、运力单位、可承运货种、服务区域和空档船期。
            </p>
          </a>

          <a
            href="/my-profile"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
          >
            <h3 className="text-xl font-bold">我的资料</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              查看和修改企业资料，重新上传营业执照，并查看平台认证状态。
            </p>
          </a>

          <a
            href="/my-cargo"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
          >
            <h3 className="text-xl font-bold">我的货源</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              管理我发布的货源订单，查看联系记录，标记完成或关闭订单。
            </p>
          </a>

          <a
            href="/my-vessels"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
          >
            <h3 className="text-xl font-bold">我的船源</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              管理我发布的船源，查看联系记录，并关闭已失效船源。
            </p>
          </a>

          <a
            href="/contacts"
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
          >
            <h3 className="text-xl font-bold">联系记录</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              查看我发起或收到的联系申请记录。
            </p>
          </a>
        </div>
      </section>
    </main>
  );
}