<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $subjects = [
            [
                'name' => 'Hóa học',
                'code' => 'CHEM',
                'description' => 'Môn Hóa học Trung học Phổ thông GDPT 2018',
            ],
            [
                'name' => 'Sinh học',
                'code' => 'BIO',
                'description' => 'Môn Sinh học Trung học Phổ thông GDPT 2018',
            ],
            [
                'name' => 'Tiếng Anh',
                'code' => 'ENG',
                'description' => 'Môn Tiếng Anh Trung học Phổ thông GDPT 2018',
            ],
            [
                'name' => 'Lịch sử',
                'code' => 'HIST',
                'description' => 'Môn Lịch sử Trung học Phổ thông GDPT 2018',
            ],
            [
                'name' => 'Địa lí',
                'code' => 'GEO',
                'description' => 'Môn Địa lí Trung học Phổ thông GDPT 2018',
            ],
            [
                'name' => 'Tin học',
                'code' => 'INFO',
                'description' => 'Môn Tin học Trung học Phổ thông GDPT 2018',
            ],
        ];

        foreach ($subjects as $sub) {
            DB::table('subjects')->updateOrInsert(
                ['code' => $sub['code']],
                [
                    'name' => $sub['name'],
                    'description' => $sub['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        DB::table('subjects')->whereIn('code', ['CHEM', 'BIO', 'ENG', 'HIST', 'GEO', 'INFO'])->delete();
    }
};
