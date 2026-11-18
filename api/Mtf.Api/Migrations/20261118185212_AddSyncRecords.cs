using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mtf.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSyncRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "records_seq");

            migrationBuilder.CreateTable(
                name: "records",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    data = table.Column<string>(type: "jsonb", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    seq = table.Column<long>(type: "bigint", nullable: false, defaultValueSql: "nextval('records_seq')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_records", x => new { x.user_id, x.kind, x.id });
                    table.ForeignKey(
                        name: "fk_records_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sync_accounts",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    purged_seq = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sync_accounts", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_sync_accounts_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_records_user_id_seq",
                table: "records",
                columns: new[] { "user_id", "seq" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "records");

            migrationBuilder.DropTable(
                name: "sync_accounts");

            migrationBuilder.DropSequence(
                name: "records_seq");
        }
    }
}
